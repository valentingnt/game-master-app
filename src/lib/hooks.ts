import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "./supabaseClient"
import type {
  AppState,
  InventoryItem,
  Player,
  Shop,
  ShopItem,
  Message,
  MaskImage,
  MaskPointer,
} from "./types"
import { enqueue, registerHandler } from "./offlineQueue"

// Shared helpers
async function fetchAppStateId(): Promise<string> {
  const { data, error } = await supabase
    .from("app_state")
    .select("id")
    .limit(1)
    .single()
  if (error) throw error
  return (data as unknown as { id: string }).id
}

async function updateAppStateField<K extends keyof AppState>(
  field: K,
  value: AppState[K]
) {
  const id = await fetchAppStateId()
  const { error } = await supabase
    .from("app_state")
    .update({ [field]: value } as any)
    .eq("id", id)
  if (error) throw error
}

async function advanceDayOnServer() {
  const { data, error } = await supabase
    .from("app_state")
    .select("id, day")
    .limit(1)
    .single()
  if (error) throw error
  const app = data as unknown as { id: string; day: number }
  const next = (app.day ?? 0) + 1
  const { error: updErr } = await supabase
    .from("app_state")
    .update({ day: next })
    .eq("id", app.id)
  if (updErr) throw updErr

  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, hunger, thirst")
  if (pErr) throw pErr
  const updates = (players ?? []).map((pl: any) => ({
    id: pl.id,
    action_points: 2,
    hunger: Math.max(-2, (pl.hunger ?? 0) - 1),
    thirst: Math.max(-2, (pl.thirst ?? 0) - 1),
  }))
  if (updates.length > 0) {
    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from("players")
          .update({
            action_points: u.action_points,
            hunger: u.hunger,
            thirst: u.thirst,
          })
          .eq("id", u.id)
      )
    )
    const firstErr = results.find((r) => (r as any).error)?.error
    if (firstErr) throw firstErr
  }
}

export function useUpdateAppStateField<K extends keyof AppState>(field: K) {
  const qc = useQueryClient()
  registerHandler("updateAppStateField", async (varsAny: unknown) => {
    const vars = varsAny as { field: keyof AppState; value: unknown }
    await updateAppStateField(vars.field as any, vars.value as any)
  })
  return useMutation({
    mutationFn: async (value: AppState[K]) => updateAppStateField(field, value),
    onMutate: async (value: AppState[K]) => {
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prev = qc.getQueryData<AppState>(["app_state"])!
      qc.setQueryData<AppState>(["app_state"], {
        ...prev,
        [field]: value as any,
      })
      return { prev }
    },
    onError: async (_e, value, ctx) => {
      if (ctx?.prev) qc.setQueryData(["app_state"], ctx.prev)
      await enqueue({
        key: "updateAppStateField",
        payload: { field, value },
        run: async () => updateAppStateField(field, value),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_state"] }),
  })
}

export function useAppState() {
  return useQuery({
    queryKey: ["app_state"],
    queryFn: async (): Promise<AppState> => {
      const { data, error } = await supabase
        .from("app_state")
        .select("*")
        .limit(1)
        .single()
      if (error) throw error
      return data as unknown as AppState
    },
    staleTime: 5_000,
  })
}

export function useUpdateTokens() {
  return useUpdateAppStateField("tokens")
}

export function useAdvanceDay() {
  const qc = useQueryClient()
  registerHandler("advanceDay", async () => {
    await advanceDayOnServer()
  })
  return useMutation({
    mutationFn: async () => advanceDayOnServer(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prevApp = qc.getQueryData<AppState>(["app_state"])!
      qc.setQueryData<AppState>(["app_state"], {
        ...prevApp,
        day: (prevApp?.day ?? 0) + 1,
      })
      return { prevApp }
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return
      if (ctx.prevApp) qc.setQueryData(["app_state"], ctx.prevApp)
      void enqueue({
        key: "advanceDay",
        payload: {},
        run: async () => advanceDayOnServer(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app_state"] })
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

// Messages
export function useMessages() {
  return useQuery({
    queryKey: ["messages"],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Message[]
    },
    staleTime: 5_000,
  })
}

export function useSendMessages() {
  const qc = useQueryClient()
  registerHandler("sendMessages", async (varsAny: unknown) => {
    const vars = varsAny as { content: string; targetIds: (string | null)[] }
    const rows = vars.targetIds.map((tid) => ({
      content: vars.content,
      target_player_id: tid,
      show: true,
    }))
    const { error } = await supabase.from("messages").insert(rows as any)
    if (error) throw error
  })
  return useMutation({
    mutationFn: async ({
      content,
      targetIds,
    }: {
      content: string
      targetIds: (string | null)[]
    }) => {
      const rows = targetIds.map((tid) => ({
        content,
        target_player_id: tid,
        show: true,
      }))
      const { error } = await supabase.from("messages").insert(rows as any)
      if (error) throw error
    },
    onMutate: async ({ content, targetIds }) => {
      await qc.cancelQueries({ queryKey: ["messages"] })
      const prev = qc.getQueryData<Message[]>(["messages"]) ?? []
      const optimistic: Message[] = targetIds.map((tid) => ({
        id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        content,
        target_player_id: tid,
        show: true,
        created_at: new Date().toISOString(),
      }))
      qc.setQueryData(["messages"], [...optimistic, ...prev])
      return { prev }
    },
    onError: async (_e, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["messages"], ctx.prev)
      await enqueue({
        key: "sendMessages",
        payload: vars,
        run: async () => {
          const rows = vars.targetIds.map((tid) => ({
            content: vars.content,
            target_player_id: tid,
            show: true,
          }))
          const { error } = await supabase.from("messages").insert(rows as any)
          if (error) throw error
        },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  })
}

export function useToggleMessageVisibility() {
  const qc = useQueryClient()
  registerHandler("toggleMessageVisibility", async (varsAny: unknown) => {
    const vars = varsAny as { id: string; show: boolean }
    const { error } = await supabase
      .from("messages")
      .update({ show: vars.show })
      .eq("id", vars.id)
    if (error) throw error
  })
  return useMutation({
    mutationFn: async ({ id, show }: { id: string; show: boolean }) => {
      const { error } = await supabase
        .from("messages")
        .update({ show })
        .eq("id", id)
      if (error) throw error
    },
    onMutate: async ({ id, show }) => {
      await qc.cancelQueries({ queryKey: ["messages"] })
      const prev = qc.getQueryData<Message[]>(["messages"]) ?? []
      const next = prev.map((m) => (m.id === id ? { ...m, show } : m))
      qc.setQueryData(["messages"], next)
      return { prev }
    },
    onError: async (_e, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["messages"], ctx.prev)
      await enqueue({
        key: "toggleMessageVisibility",
        payload: vars,
        run: async () => {
          const { error } = await supabase
            .from("messages")
            .update({ show: vars.show })
            .eq("id", vars.id)
          if (error) throw error
        },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  })
}

export function useUpdateDay() {
  return useUpdateAppStateField("day")
}

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("item_name")
      if (error) throw error
      return (data ?? []) as InventoryItem[]
    },
    staleTime: 5_000,
  })
}

export function useUpsertInventoryItem() {
  const qc = useQueryClient()
  registerHandler("upsertInventory", async (varsAny: unknown) => {
    const vars = varsAny as { id?: string; item_name: string; quantity: number }
    if (vars.id) {
      const { error } = await supabase
        .from("inventory")
        .update({ item_name: vars.item_name, quantity: vars.quantity })
        .eq("id", vars.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("inventory")
        .insert({ item_name: vars.item_name, quantity: vars.quantity })
      if (error) throw error
    }
  })
  return useMutation({
    mutationFn: async ({
      id,
      item_name,
      quantity,
    }: {
      id?: string
      item_name: string
      quantity: number
    }) => {
      if (id) {
        const { error } = await supabase
          .from("inventory")
          .update({ item_name, quantity })
          .eq("id", id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("inventory")
          .insert({ item_name, quantity })
        if (error) throw error
      }
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["inventory"] })
      const prev = qc.getQueryData<InventoryItem[]>(["inventory"]) ?? []
      let next: InventoryItem[] = prev
      if (vars.id) {
        next = prev.map((it) =>
          it.id === vars.id
            ? { ...it, item_name: vars.item_name, quantity: vars.quantity }
            : it
        )
        qc.setQueryData(["inventory"], next)
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["inventory"], ctx.prev)
      const vars = _v
      if (!vars) return
      void enqueue({
        key: "upsertInventory",
        payload: vars,
        run: async () => {
          if (vars.id) {
            const { error } = await supabase
              .from("inventory")
              .update({ item_name: vars.item_name, quantity: vars.quantity })
              .eq("id", vars.id)
            if (error) throw error
          } else {
            const { error } = await supabase
              .from("inventory")
              .insert({ item_name: vars.item_name, quantity: vars.quantity })
            if (error) throw error
          }
        },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient()
  registerHandler("deleteInventory", async (varsAny: unknown) => {
    const vars =
      typeof varsAny === "string"
        ? { id: varsAny }
        : (varsAny as { id: string })
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", vars.id)
    if (error) throw error
  })
  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      if (vars.id.startsWith("optimistic-")) return
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", vars.id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["inventory"] })
      const prev = qc.getQueryData<InventoryItem[]>(["inventory"]) ?? []
      const itemId = (id as any).id ?? (id as any)
      const next = prev.filter((it) => it.id !== itemId)
      qc.setQueryData(["inventory"], next)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      const isOffline =
        typeof navigator !== "undefined" && (navigator as any).onLine === false
      if (!isOffline && ctx?.prev) qc.setQueryData(["inventory"], ctx.prev)
      const id = (typeof _v === "string" ? _v : (_v as any).id) as string
      void enqueue({
        key: "deleteInventory",
        payload: { id },
        run: async () => {
          const { error } = await supabase
            .from("inventory")
            .delete()
            .eq("id", id)
          if (error) throw error
        },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  })
}

export function useUpdateLEDMain() {
  return useUpdateAppStateField("led_main_text")
}

export function useUpdateLEDSmallTop() {
  return useUpdateAppStateField("led_small_top")
}

export function useUpdateLEDSmallBottom() {
  return useUpdateAppStateField("led_small_bottom")
}

export function usePlayers() {
  return useQuery({
    queryKey: ["players"],
    queryFn: async (): Promise<Player[]> => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("order", { ascending: true })
      if (error) throw error
      return (data ?? []) as Player[]
    },
  })
}

export function useUpdatePlayerField() {
  const qc = useQueryClient()
  registerHandler("updatePlayerField", async (varsAny: unknown) => {
    const vars = varsAny as { id: string; field: keyof Player; value: unknown }
    const { error } = await supabase
      .from("players")
      .update({ [vars.field]: vars.value })
      .eq("id", vars.id)
    if (error) throw error
  })
  return useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string
      field: keyof Player
      value: unknown
    }) => {
      const { error } = await supabase
        .from("players")
        .update({ [field]: value })
        .eq("id", id)
      if (error) throw error
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["players"] })
      const prev = qc.getQueryData<Player[]>(["players"]) ?? []
      const next = prev.map((pl) =>
        pl.id === vars.id ? { ...pl, [vars.field]: vars.value as any } : pl
      )
      qc.setQueryData(["players"], next)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["players"], ctx.prev)
      const vars = _v
      void enqueue({
        key: "updatePlayerField",
        payload: vars,
        run: async () => {
          const { error } = await supabase
            .from("players")
            .update({ [vars.field]: vars.value })
            .eq("id", vars.id)
          if (error) throw error
        },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export function useUploadPlayerAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      file,
      previousUrl,
    }: {
      id: string
      file: File
      previousUrl?: string | null
    }) => {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase()
      const path = `${id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from("pp")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "application/octet-stream",
        })
      if (uploadErr) throw uploadErr
      const { data: pub } = await supabase.storage.from("pp").getPublicUrl(path)
      const url = (pub as any)?.publicUrl as string
      const { error: updErr } = await supabase
        .from("players")
        .update({ avatar_url: url })
        .eq("id", id)
      if (updErr) throw updErr
      // Best-effort delete of previous file if provided
      try {
        const src = (previousUrl ?? "").trim()
        let oldPath = ""
        if (src.includes("/storage/v1/object/public/pp/")) {
          oldPath = src.split("/storage/v1/object/public/pp/")[1] || ""
        } else if (src.includes("/storage/v1/object/pp/")) {
          oldPath = src.split("/storage/v1/object/pp/")[1] || ""
        } else if (src.startsWith("pp/")) {
          oldPath = src.replace(/^pp\//, "")
        }
        if (oldPath && oldPath !== path) {
          await supabase.storage.from("pp").remove([oldPath])
        }
      } catch (_e) {
        // ignore delete errors
      }
      return url
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export function useClearPlayerAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string | null }) => {
      // Best-effort delete of the storage object if URL points to pp bucket
      try {
        const src = (url ?? "").trim()
        // Accept both public and non-public paths
        let path = ""
        if (src.includes("/storage/v1/object/public/pp/")) {
          path = src.split("/storage/v1/object/public/pp/")[1] || ""
        } else if (src.includes("/storage/v1/object/pp/")) {
          path = src.split("/storage/v1/object/pp/")[1] || ""
        } else if (src.startsWith("pp/")) {
          path = src.replace(/^pp\//, "")
        }
        if (path) {
          await supabase.storage.from("pp").remove([path])
        }
      } catch (_e) {
        // ignore storage delete failures
      }
      const { error: updErr } = await supabase
        .from("players")
        .update({ avatar_url: "" })
        .eq("id", id)
      if (updErr) throw updErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export function useShop(shopId: string) {
  return useQuery({
    queryKey: ["shop", shopId],
    queryFn: async (): Promise<{ shop: Shop | null; items: ShopItem[] }> => {
      const { data: shop, error: e1 } = await supabase
        .from("shops")
        .select("*")
        .eq("slug", shopId)
        .single()
      if (e1) throw e1
      const { data: items, error: e2 } = await supabase
        .from("shop_items")
        .select("*")
        .eq("shop_id", (shop as any)?.id)
      if (e2) throw e2
      return {
        shop: (shop as unknown as Shop) ?? null,
        items: (items as ShopItem[]) ?? [],
      }
    },
  })
}

export function useToggleShopUnlock() {
  const qc = useQueryClient()
  registerHandler("toggleShopUnlock", async (varsAny: unknown) => {
    const vars = varsAny as { id: string; unlocked: boolean }
    const { error } = await supabase
      .from("shops")
      .update({ unlocked: vars.unlocked })
      .eq("id", vars.id)
    if (error) throw error
  })
  return useMutation({
    mutationFn: async ({ id, unlocked }: { id: string; unlocked: boolean }) => {
      const { error } = await supabase
        .from("shops")
        .update({ unlocked })
        .eq("id", id)
      if (error) throw error
    },
    onMutate: async ({ id, unlocked }) => {
      const keys = qc
        .getQueryCache()
        .findAll({ queryKey: ["shop"] })
        .map((q) => q.queryKey as [string, string])
      for (const key of keys) {
        const data = qc.getQueryData<{ shop: Shop | null; items: ShopItem[] }>(
          key
        )
        if (data?.shop?.id === id) {
          qc.setQueryData(key, { ...data, shop: { ...data.shop, unlocked } })
        }
      }
    },
    onError: async (_e, vars) => {
      qc.invalidateQueries({ queryKey: ["shop"] })
      await enqueue({
        key: "toggleShopUnlock",
        payload: vars,
        run: async () => {
          const { error } = await supabase
            .from("shops")
            .update({ unlocked: vars.unlocked })
            .eq("id", vars.id)
          if (error) throw error
        },
      })
    },
  })
}

export function useUpsertShopItem() {
  const qc = useQueryClient()
  registerHandler("upsertShopItem", async (itemAny: unknown) => {
    const item = itemAny as Partial<ShopItem> & { shop_id: string }
    if (item.id) {
      const { error } = await supabase
        .from("shop_items")
        .update({
          name: item.name,
          price: item.price,
          bundle_quantity: item.bundle_quantity,
          disabled: item.disabled ?? false,
        })
        .eq("id", item.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from("shop_items").insert({
        shop_id: item.shop_id,
        name: item.name,
        price: item.price,
        bundle_quantity: item.bundle_quantity ?? 1,
        disabled: item.disabled ?? false,
      })
      if (error) throw error
    }
  })
  return useMutation({
    mutationFn: async (item: Partial<ShopItem> & { shop_id: string }) => {
      if (item.id) {
        const { error } = await supabase
          .from("shop_items")
          .update({
            name: item.name,
            price: item.price,
            bundle_quantity: item.bundle_quantity,
            disabled: item.disabled ?? false,
          })
          .eq("id", item.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("shop_items").insert({
          shop_id: item.shop_id,
          name: item.name,
          price: item.price,
          bundle_quantity: item.bundle_quantity ?? 1,
          disabled: item.disabled ?? false,
        })
        if (error) throw error
      }
    },
    onMutate: async (item) => {
      const key: [string, string] = ["shop", item.shop_id]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<{ shop: Shop | null; items: ShopItem[] }>(
        key
      )
      if (prev) {
        let nextItems: ShopItem[]
        if (item.id) {
          nextItems = prev.items.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  name: item.name ?? it.name,
                  price: item.price ?? it.price,
                  bundle_quantity: item.bundle_quantity ?? it.bundle_quantity,
                  disabled: item.disabled ?? it.disabled,
                }
              : it
          )
        } else {
          const temp: ShopItem = {
            id: `optimistic-${Date.now()}`,
            shop_id: item.shop_id,
            name: item.name ?? "New Item",
            price: item.price ?? 0,
            bundle_quantity: item.bundle_quantity ?? 1,
            disabled: item.disabled ?? false,
          }
          nextItems = [...prev.items, temp]
        }
        qc.setQueryData(key, { ...prev, items: nextItems })
      }
      return { key, prev }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.key && ctx?.prev) {
        qc.setQueryData(ctx.key, ctx.prev)
      }
      const item = _vars
      if (!item) return
      void enqueue({
        key: "upsertShopItem",
        payload: item,
        run: async () => {
          if (item.id) {
            const { error } = await supabase
              .from("shop_items")
              .update({
                name: item.name,
                price: item.price,
                bundle_quantity: item.bundle_quantity,
                disabled: item.disabled ?? false,
              })
              .eq("id", item.id)
            if (error) throw error
          } else {
            const { error } = await supabase.from("shop_items").insert({
              shop_id: item.shop_id,
              name: item.name,
              price: item.price,
              bundle_quantity: item.bundle_quantity ?? 1,
              disabled: item.disabled ?? false,
            })
            if (error) throw error
          }
        },
      })
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["shop", vars.shop_id] })
    },
  })
}

export function useToggleShopItemDisabled() {
  const qc = useQueryClient()
  registerHandler("toggleShopItemDisabled", async (varsAny: unknown) => {
    const vars = varsAny as { id: string; disabled: boolean; shop_id: string }
    const { error } = await supabase
      .from("shop_items")
      .update({ disabled: vars.disabled })
      .eq("id", vars.id)
    if (error) throw error
  })
  return useMutation({
    mutationFn: async ({
      id,
      disabled,
      shop_id,
    }: {
      id: string
      disabled: boolean
      shop_id: string
    }) => {
      const { error } = await supabase
        .from("shop_items")
        .update({ disabled })
        .eq("id", id)
      if (error) throw error
    },
    onMutate: async ({ id, disabled, shop_id }) => {
      const key: [string, string] = ["shop", shop_id]
      const data = qc.getQueryData<{ shop: Shop | null; items: ShopItem[] }>(
        key
      )
      if (data) {
        qc.setQueryData(key, {
          ...data,
          items: data.items.map((it) =>
            it.id === id ? { ...it, disabled } : it
          ),
        })
      }
    },
    onError: async (_e, vars) => {
      qc.invalidateQueries({ queryKey: ["shop", vars.shop_id] })
      await enqueue({
        key: "toggleShopItemDisabled",
        payload: vars,
        run: async () => {
          const { error } = await supabase
            .from("shop_items")
            .update({ disabled: vars.disabled })
            .eq("id", vars.id)
          if (error) throw error
        },
      })
    },
  })
}

export function useDeleteShopItem() {
  const qc = useQueryClient()
  registerHandler("deleteShopItem", async (varsAny: unknown) => {
    const vars = varsAny as { id: string; shop_id: string }
    const { error } = await supabase
      .from("shop_items")
      .delete()
      .eq("id", vars.id)
    if (error) throw error
  })
  return useMutation({
    mutationFn: async ({ id, shop_id }: { id: string; shop_id: string }) => {
      const { error } = await supabase.from("shop_items").delete().eq("id", id)
      if (error) throw error
    },
    onMutate: async ({ id, shop_id }) => {
      const key: [string, string] = ["shop", shop_id]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<{ shop: Shop | null; items: ShopItem[] }>(
        key
      )
      if (prev) {
        qc.setQueryData(key, {
          ...prev,
          items: prev.items.filter((it) => it.id !== id),
        })
      }
      return { key, prev }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.key && ctx?.prev) qc.setQueryData(ctx.key, ctx.prev)
      const vars = _vars
      void enqueue({
        key: "deleteShopItem",
        payload: vars,
        run: async () => {
          const { error } = await supabase
            .from("shop_items")
            .delete()
            .eq("id", vars.id)
          if (error) throw error
        },
      })
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["shop", vars.shop_id] })
    },
  })
}

export function usePurchaseItem() {
  const qc = useQueryClient()
  registerHandler("purchaseItem", async (varsAny: unknown) => {
    const v = varsAny as {
      name: string
      price: number
      bundle_quantity: number
    }
    const { error } = await supabase.rpc("purchase_item", {
      name: v.name,
      price: v.price,
      bundle_quantity: v.bundle_quantity,
    } as any)
    if (error) throw error
  })
  return useMutation({
    mutationFn: async ({
      name,
      price,
      bundle_quantity,
    }: {
      name: string
      price: number
      bundle_quantity: number
    }) => {
      const { error: rpcError } = await supabase.rpc("purchase_item", {
        name,
        price,
        bundle_quantity,
      } as any)
      if (rpcError) {
        const { data: asData, error: asErr } = await supabase
          .from("app_state")
          .select("id, tokens")
          .limit(1)
          .single()
        if (asErr) throw asErr
        const app = asData as unknown as { id: string; tokens: number }
        if ((app.tokens ?? 0) < price) throw new Error("INSUFFICIENT_TOKENS")
        const nextTokens = Math.max(0, (app.tokens ?? 0) - price)
        const { error: updTokensErr } = await supabase
          .from("app_state")
          .update({ tokens: nextTokens })
          .eq("id", app.id)
        if (updTokensErr) throw updTokensErr

        const { data: inv, error: invErr } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("item_name", name)
          .limit(1)
          .maybeSingle()
        if (invErr) throw invErr
        if (inv?.id) {
          const { error } = await supabase
            .from("inventory")
            .update({ quantity: (inv.quantity ?? 0) + bundle_quantity })
            .eq("id", inv.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from("inventory")
            .insert({ item_name: name, quantity: bundle_quantity })
          if (error) throw error
        }
      }
    },
    onMutate: async ({ name, price, bundle_quantity }) => {
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prevApp = qc.getQueryData<AppState>(["app_state"])!
      const nextTokens = Math.max(0, (prevApp?.tokens ?? 0) - price)
      qc.setQueryData<AppState>(["app_state"], {
        ...prevApp,
        tokens: nextTokens,
      })

      await qc.cancelQueries({ queryKey: ["inventory"] })
      const prevInv = qc.getQueryData<InventoryItem[]>(["inventory"]) ?? []
      const existing = prevInv.find((i) => i.item_name === name)
      let nextInv: InventoryItem[]
      if (existing) {
        nextInv = prevInv.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: (i.quantity ?? 0) + bundle_quantity }
            : i
        )
      } else {
        nextInv = [
          ...prevInv,
          {
            id: `optimistic-${Date.now()}`,
            item_name: name,
            quantity: bundle_quantity,
          },
        ]
      }
      qc.setQueryData(["inventory"], nextInv)
      return { prevApp, prevInv }
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return
      if (ctx.prevApp) qc.setQueryData(["app_state"], ctx.prevApp)
      if (ctx.prevInv) qc.setQueryData(["inventory"], ctx.prevInv)
      const vars = _v
      if (!vars) return
      void enqueue({
        key: "purchaseItem",
        payload: vars,
        run: async () => {
          const { error } = await supabase.rpc("purchase_item", {
            name: vars.name,
            price: vars.price,
            bundle_quantity: vars.bundle_quantity,
          } as any)
          if (error) throw error
        },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app_state"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}

// Mask images
export function useMaskImages() {
  return useQuery({
    queryKey: ["mask_images"],
    queryFn: async (): Promise<MaskImage[]> => {
      const { data, error } = await supabase
        .from("mask_images")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as MaskImage[]
    },
    staleTime: 5_000,
  })
}

export function useUploadMaskImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, name }: { file: File; name: string }) => {
      // Derive dimensions
      const dims = await new Promise<{ width: number; height: number }>(
        (res, rej) => {
          const img = new Image()
          img.onload = () =>
            res({ width: img.naturalWidth, height: img.naturalHeight })
          img.onerror = rej
          img.src = URL.createObjectURL(file)
        }
      )
      const ext = (file.name.split(".").pop() || "png").toLowerCase()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from("masks")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "image/png",
        })
      if (uploadErr) throw uploadErr
      const { data: pub } = await supabase.storage
        .from("masks")
        .getPublicUrl(path)
      const url = (pub as any)?.publicUrl as string
      const { error: insErr } = await supabase.from("mask_images").insert({
        name,
        url,
        width: dims.width,
        height: dims.height,
      } as any)
      if (insErr) throw insErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mask_images"] })
    },
  })
}

export function useDeleteMaskImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      try {
        const src = (url ?? "").trim()
        let path = ""
        if (src.includes("/storage/v1/object/public/masks/")) {
          path = src.split("/storage/v1/object/public/masks/")[1] || ""
        } else if (src.includes("/storage/v1/object/masks/")) {
          path = src.split("/storage/v1/object/masks/")[1] || ""
        } else if (src.startsWith("masks/")) {
          path = src.replace(/^masks\//, "")
        }
        if (path) {
          await supabase.storage.from("masks").remove([path])
        }
      } catch {}
      const { error } = await supabase.from("mask_images").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mask_images"] })
      qc.invalidateQueries({ queryKey: ["app_state"] })
    },
  })
}

export function useActivateMask() {
  const mutate = useUpdateAppStateField("active_mask_id")
  return {
    activate: (id: string) => mutate.mutate(id as any),
    deactivate: () => mutate.mutate(null as any),
    mutation: mutate,
  }
}

export function useActiveMaskImage() {
  return useQuery({
    queryKey: ["active_mask_image"],
    queryFn: async (): Promise<MaskImage | null> => {
      const { data: asData, error: asErr } = await supabase
        .from("app_state")
        .select("active_mask_id")
        .limit(1)
        .single()
      if (asErr) throw asErr
      const activeId = (asData as any)?.active_mask_id as string | null
      if (!activeId) return null
      const { data, error } = await supabase
        .from("mask_images")
        .select("*")
        .eq("id", activeId)
        .maybeSingle()
      if (error) throw error
      return (data as any) ?? null
    },
    staleTime: 2_000,
  })
}

// Mask pointer
export function useMaskPointer() {
  return useQuery({
    queryKey: ["mask_pointer"],
    queryFn: async (): Promise<MaskPointer | null> => {
      const { data, error } = await supabase
        .from("mask_pointer")
        .select("*")
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as any) ?? null
    },
    staleTime: 500,
  })
}

export function useUpdateMaskPointer() {
  const qc = useQueryClient()
  registerHandler("updateMaskPointer", async (varsAny: unknown) => {
    const v = varsAny as { x: number; y: number }
    const { data, error } = await supabase
      .from("mask_pointer")
      .select("id")
      .limit(1)
      .single()
    if (error) throw error
    const id = (data as any).id as string
    const { error: updErr } = await supabase
      .from("mask_pointer")
      .update({ x: v.x, y: v.y, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (updErr) throw updErr
  })
  return useMutation({
    mutationFn: async ({ x, y }: { x: number; y: number }) => {
      const { data, error } = await supabase
        .from("mask_pointer")
        .select("id")
        .limit(1)
        .single()
      if (error) throw error
      const id = (data as any).id as string
      const { error: updErr } = await supabase
        .from("mask_pointer")
        .update({ x, y, updated_at: new Date().toISOString() })
        .eq("id", id)
      if (updErr) throw updErr
    },
    onMutate: async ({ x, y }) => {
      await qc.cancelQueries({ queryKey: ["mask_pointer"] })
      const prev = qc.getQueryData<MaskPointer | null>(["mask_pointer"]) || null
      const next: MaskPointer = {
        id: prev?.id ?? "optimistic",
        x,
        y,
        updated_at: new Date().toISOString(),
      }
      qc.setQueryData(["mask_pointer"], next)
      return { prev }
    },
    onError: async (_e, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["mask_pointer"], ctx.prev)
      await enqueue({
        key: "updateMaskPointer",
        payload: { x: vars.x, y: vars.y },
        run: async () => {
          const { data, error } = await supabase
            .from("mask_pointer")
            .select("id")
            .limit(1)
            .single()
          if (error) throw error
          const id = (data as any).id as string
          const { error: updErr } = await supabase
            .from("mask_pointer")
            .update({
              x: vars.x,
              y: vars.y,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
          if (updErr) throw updErr
        },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mask_pointer"] }),
  })
}
