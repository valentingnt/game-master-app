import { supabase } from "./supabaseClient"
import type { QueryClient } from "@tanstack/react-query"

export function subscribeAppState(qc: QueryClient) {
  return supabase
    .channel("app_state_changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "app_state" },
      () => {
        qc.invalidateQueries({ queryKey: ["app_state"] })
        qc.invalidateQueries({ queryKey: ["active_mask_image"] })
      }
    )
    .subscribe()
}

export function subscribeInventory(qc: QueryClient) {
  return supabase
    .channel("inventory_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "inventory" },
      () => qc.invalidateQueries({ queryKey: ["inventory"] })
    )
    .subscribe()
}

export function subscribePlayers(qc: QueryClient) {
  return supabase
    .channel("players_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players" },
      () => qc.invalidateQueries({ queryKey: ["players"] })
    )
    .subscribe()
}

export function subscribeShops(qc: QueryClient) {
  const shop = supabase
    .channel("shops_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shops" },
      () => qc.invalidateQueries({ queryKey: ["shop"] })
    )
    .subscribe()
  const items = supabase
    .channel("shop_items_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shop_items" },
      () => qc.invalidateQueries({ queryKey: ["shop"] })
    )
    .subscribe()
  return { shop, items }
}

export function subscribeMessages(qc: QueryClient) {
  return supabase
    .channel("messages_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => qc.invalidateQueries({ queryKey: ["messages"] })
    )
    .subscribe()
}

export function subscribeMaskImages(qc: QueryClient) {
  return supabase
    .channel("mask_images_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mask_images" },
      () => {
        qc.invalidateQueries({ queryKey: ["mask_images"] })
        qc.invalidateQueries({ queryKey: ["active_mask_image"] })
      }
    )
    .subscribe()
}

export function subscribeMaskPointer(qc: QueryClient) {
  return supabase
    .channel("mask_pointer_changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "mask_pointer" },
      () => qc.invalidateQueries({ queryKey: ["mask_pointer"] })
    )
    .subscribe()
}
