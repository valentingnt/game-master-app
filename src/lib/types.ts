export type AppState = {
  id: string
  day: number
  tokens: number
  led_main_text: string
  led_small_top: string
  led_small_bottom: string
  active_mask_id?: string | null
  mask_spotlight_enabled?: boolean
  mask_show_on_display?: boolean
  mask_target_player_ids?: string[]
}

export type InventoryItem = {
  id: string
  item_name: string
  quantity: number
}

export type PlayerInventoryItem = {
  id: string
  player_id: string
  item_name: string
  quantity: number
}

export type Player = {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  is_dead: boolean
  hp_current: number
  hp_max: number
  action_points: number
  hunger: number
  thirst: number
  fatigue: number
  orientation: number
  strength: number
  resistance: number
  charisma: number
  agility: number
  dexterity: number
  intuition: number
  order: number
  history?: string | null
  physical_description?: string | null
  character_traits?: string | null
  age?: string | null
  size?: string | null
  weight?: string | null
  sex?: string | null
  astrological_sign?: string | null
}

export type Shop = {
  id: string
  unlocked: boolean
  slug: string
}

export type ShopItem = {
  id: string
  shop_id: string
  name: string
  price: number
  bundle_quantity: number
  disabled?: boolean
}

export type Message = {
  id: string
  content: string
  target_player_id: string | null
  show: boolean
  created_at: string
}

export type MaskImage = {
  id: string
  name: string
  url: string
  width?: number | null
  height?: number | null
  created_at?: string
  storage_path?: string | null
  rotate_90?: boolean
  rotation_quarters?: number | null
}

export type MaskPointer = {
  id: string
  x: number
  y: number
  updated_at?: string
}
