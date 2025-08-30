import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "./supabaseClient"
import type { AppState, InventoryItem, Player, Shop, ShopItem } from "./types"
import { enqueue, registerHandler } from "./offlineQueue"

const APP_STATE_ID = "app-state-singleton"

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
  const qc = useQueryClient()
  // Register handler once for persisted queue replay
  registerHandler("updateTokens", async (tokensAny: unknown) => {
    const tokens = tokensAny as number
    const { data, error } = await supabase
      .from("app_state")
      .select("id")
      .limit(1)
      .single()
    if (error) throw error
    const id = (data as unknown as { id: string }).id
    const { error: updErr } = await supabase
      .from("app_state")
      .update({ tokens })
      .eq("id", id)
    if (updErr) throw updErr
  })
  return useMutation({
    mutationFn: async (tokens: number) => {
      const cached = qc.getQueryData<AppState>(["app_state"]) as
        | AppState
        | undefined
      let id = cached?.id
      if (!id) {
        const { data, error } = await supabase
          .from("app_state")
          .select("id")
          .limit(1)
          .single()
        if (error) throw error
        id = (data as unknown as { id: string }).id
      }
      const { error } = await supabase
        .from("app_state")
        .update({ tokens })
        .eq("id", id!)
      if (error) throw error
    },
    onMutate: async (tokens) => {
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prev = qc.getQueryData<AppState>(["app_state"])!
      qc.setQueryData<AppState>(["app_state"], { ...prev, tokens })
      return { prev }
    },
    onError: async (_err, tokens, ctx) => {
      if (ctx?.prev) qc.setQueryData(["app_state"], ctx.prev)
      const cached = qc.getQueryData<AppState>(["app_state"]) as
        | AppState
        | undefined
      await enqueue({
        key: "updateTokens",
        payload: tokens,
        run: async () => {
          let id = cached?.id
          if (!id) {
            const { data, error } = await supabase
              .from("app_state")
              .select("id")
              .limit(1)
              .single()
            if (error) throw error
            id = (data as unknown as { id: string }).id
          }
          const { error } = await supabase
            .from("app_state")
            .update({ tokens })
            .eq("id", id!)
          if (error) throw error
        },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_state"] }),
  })
}

export function useAdvanceDay() {
  const qc = useQueryClient()
  registerHandler("advanceDay", async () => {
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
    for (const pl of players ?? []) {
      const { error: e } = await supabase
        .from("players")
        .update({
          action_points: 2,
          hunger: Math.max(-2, (pl.hunger ?? 0) - 1),
          thirst: Math.max(-2, (pl.thirst ?? 0) - 1),
        })
        .eq("id", (pl as any).id)
      if (e) throw e
    }
  })
  return useMutation({
    mutationFn: async () => {
      // Always read current day from server to avoid double-increment with optimistic cache
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

      // Progress players on the server to avoid cache conflicts
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
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prevApp = qc.getQueryData<AppState>(["app_state"])!
      // Optimistically increment day
      qc.setQueryData<AppState>(["app_state"], {
        ...prevApp,
        day: (prevApp?.day ?? 0) + 1,
      })
      return { prevApp }
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return
      if (ctx.prevApp) qc.setQueryData(["app_state"], ctx.prevApp)
      // Queue the operation to retry when back online
      void enqueue({
        key: "advanceDay",
        payload: {},
        run: async () => {
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
          for (const u of updates) {
            const { error: e } = await supabase
              .from("players")
              .update({
                action_points: u.action_points,
                hunger: u.hunger,
                thirst: u.thirst,
              })
              .eq("id", u.id)
            if (e) throw e
          }
        },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app_state"] })
      qc.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export function useUpdateDay() {
  const qc = useQueryClient()
  registerHandler("updateDay", async (dayAny: unknown) => {
    const day = dayAny as number
    const { data, error } = await supabase
      .from("app_state")
      .select("id")
      .limit(1)
      .single()
    if (error) throw error
    const id = (data as unknown as { id: string }).id
    const { error: updErr } = await supabase
      .from("app_state")
      .update({ day })
      .eq("id", id)
    if (updErr) throw updErr
  })
  return useMutation({
    mutationFn: async (day: number) => {
      const { data, error } = await supabase
        .from("app_state")
        .select("id")
        .limit(1)
        .single()
      if (error) throw error
      const id = (data as unknown as { id: string }).id
      const { error: updErr } = await supabase
        .from("app_state")
        .update({ day })
        .eq("id", id)
      if (updErr) throw updErr
    },
    onMutate: async (day) => {
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prev = qc.getQueryData<AppState>(["app_state"])!
      qc.setQueryData<AppState>(["app_state"], { ...prev, day })
      return { prev }
    },
    onError: async (_e, day, ctx) => {
      if (ctx?.prev) qc.setQueryData(["app_state"], ctx.prev)
      await enqueue({
        key: "updateDay",
        payload: day,
        run: async () => {
          const { data, error } = await supabase
            .from("app_state")
            .select("id")
            .limit(1)
            .single()
          if (error) throw error
          const id = (data as unknown as { id: string }).id
          const { error: updErr } = await supabase
            .from("app_state")
            .update({ day })
            .eq("id", id)
          if (updErr) throw updErr
        },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_state"] }),
  })
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (led_main_text: string) => {
      const cached = qc.getQueryData<AppState>(["app_state"]) as
        | AppState
        | undefined
      let id = cached?.id
      if (!id) {
        const { data, error } = await supabase
          .from("app_state")
          .select("id")
          .limit(1)
          .single()
        if (error) throw error
        id = (data as unknown as { id: string }).id
      }
      const { error } = await supabase
        .from("app_state")
        .update({ led_main_text })
        .eq("id", id!)
      if (error) throw error
    },
    onMutate: async (led_main_text) => {
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prev = qc.getQueryData<AppState>(["app_state"])!
      qc.setQueryData<AppState>(["app_state"], { ...prev, led_main_text })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["app_state"], ctx.prev)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_state"] }),
  })
}

export function useUpdateLEDSmallTop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (led_small_top: string) => {
      const cached = qc.getQueryData<AppState>(["app_state"]) as
        | AppState
        | undefined
      let id = cached?.id
      if (!id) {
        const { data, error } = await supabase
          .from("app_state")
          .select("id")
          .limit(1)
          .single()
        if (error) throw error
        id = (data as unknown as { id: string }).id
      }
      const { error } = await supabase
        .from("app_state")
        .update({ led_small_top })
        .eq("id", id!)
      if (error) throw error
    },
    onMutate: async (led_small_top) => {
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prev = qc.getQueryData<AppState>(["app_state"])!
      qc.setQueryData<AppState>(["app_state"], { ...prev, led_small_top })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["app_state"], ctx.prev)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_state"] }),
  })
}

export function useUpdateLEDSmallBottom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (led_small_bottom: string) => {
      const cached = qc.getQueryData<AppState>(["app_state"]) as
        | AppState
        | undefined
      let id = cached?.id
      if (!id) {
        const { data, error } = await supabase
          .from("app_state")
          .select("id")
          .limit(1)
          .single()
        if (error) throw error
        id = (data as unknown as { id: string }).id
      }
      const { error } = await supabase
        .from("app_state")
        .update({ led_small_bottom })
        .eq("id", id!)
      if (error) throw error
    },
    onMutate: async (led_small_bottom) => {
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prev = qc.getQueryData<AppState>(["app_state"])!
      qc.setQueryData<AppState>(["app_state"], { ...prev, led_small_bottom })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["app_state"], ctx.prev)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_state"] }),
  })
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
      // Best-effort: invalidate to refetch authoritative state
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
      // Prefer atomic server-side purchase via RPC; fallback to client steps
      const { error: rpcError } = await supabase.rpc("purchase_item", {
        name,
        price,
        bundle_quantity,
      } as any)
      if (rpcError) {
        // Fallback implementation (non-atomic)
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
      // Optimistically update tokens
      await qc.cancelQueries({ queryKey: ["app_state"] })
      const prevApp = qc.getQueryData<AppState>(["app_state"])!
      const nextTokens = Math.max(0, (prevApp?.tokens ?? 0) - price)
      qc.setQueryData<AppState>(["app_state"], {
        ...prevApp,
        tokens: nextTokens,
      })

      // Optimistically update inventory
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
