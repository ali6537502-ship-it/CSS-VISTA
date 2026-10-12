import { createContext, useContext } from 'react'
export const ProReleaseContext = createContext(true)
export const useProReleasePaused = () => useContext(ProReleaseContext)
