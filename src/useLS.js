import { useEffect, useRef, useState } from 'react'

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readValue(key, fallback, legacyKey) {
  let serialized
  try {
    serialized = localStorage.getItem(key)
    if (serialized === null && legacyKey) serialized = localStorage.getItem(legacyKey)
  } catch (error) {
    console.warn(`Could not read "${key}" from local storage.`, error)
    return fallback
  }

  if (serialized === null) return fallback

  let value
  try {
    value = JSON.parse(serialized)
  } catch (error) {
    console.warn(`Could not parse "${key}" from local storage.`, error)
    return fallback
  }

  if (Array.isArray(fallback)) return Array.isArray(value) && value.length ? value : fallback
  if (isRecord(fallback)) return isRecord(value) ? { ...fallback, ...value } : fallback
  return value ?? fallback
}

function writeValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Could not save "${key}" to local storage.`, error)
  }
}

export default function useLS(key, fallback, legacyKey) {
  const [value, setValue] = useState(() => readValue(key, fallback, legacyKey))
  const latest = useRef({ key, value })
  latest.current = { key, value }

  useEffect(() => {
    const timeout = window.setTimeout(() => writeValue(key, value), 300)
    return () => window.clearTimeout(timeout)
  }, [key, value])

  useEffect(() => {
    const persistLatest = () => writeValue(latest.current.key, latest.current.value)
    window.addEventListener('pagehide', persistLatest)
    return () => {
      window.removeEventListener('pagehide', persistLatest)
      persistLatest()
    }
  }, [])

  return [value, setValue]
}
