import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { client } from "../client"
import { getKeys } from "../lib"
import { LocalStorageBackend, Store } from "../lib"
import { TUnsubscribeFn } from "../types"

export type TSettings = {
  sidebarPosition: "left" | "right"
  debugFlag: boolean
  partyParrot: boolean
  fixedIDE: boolean
  zoom: "sm" | "md" | "lg" | "xl"
}
type TSetting = keyof TSettings

type TSettingsContext = Readonly<{
  settings: TSettings
  set<TKey extends keyof TSettings>(setting: TKey, value: TSettings[TKey]): void
}>

const SettingsContext = createContext<TSettingsContext>(null!)

const initialSettings: TSettings = {
  sidebarPosition: "left",
  debugFlag: false,
  partyParrot: false,
  fixedIDE: false,
  zoom: "md",
}
function getSettingKeys(): readonly TSetting[] {
  return getKeys(initialSettings)
}

const DEBUG_STORE_KEY = "settings"
const settingsStore = new Store(new LocalStorageBackend(DEBUG_STORE_KEY))

export function SettingsProvider({ children }: Readonly<{ children?: ReactNode }>) {
  const [settings, setSettings] = useState(initialSettings)

  useEffect(() => {
    ;(async () => {
      const initialOptions = await Promise.all(
        getSettingKeys().map((option) =>
          settingsStore
            .get(option)
            .then((value) => [option, value ?? initialSettings[option]] as const)
            .catch(() => [option, false] as const)
        )
      )
      setSettings(
        initialOptions.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), initialSettings)
      )
    })()
  }, [])

  useEffect(() => {
    const subscriptions: TUnsubscribeFn[] = []

    for (const setting of getSettingKeys()) {
      subscriptions.push(
        settingsStore.subscribe(setting, (newValue) =>
          setSettings((current) => ({ ...current, [setting]: newValue }))
        )
      )
    }

    return () => {
      for (const unsubscribe of subscriptions) {
        unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    client.setSetting("debugFlag", settings.debugFlag)
  }, [settings.debugFlag])

  const set = useCallback<TSettingsContext["set"]>((key, value) => {
    settingsStore.set(key, value)
  }, [])

  const value = useMemo(() => ({ settings, set }), [set, settings])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext).settings
}

export function useChangeSettings() {
  return useContext(SettingsContext)
}
