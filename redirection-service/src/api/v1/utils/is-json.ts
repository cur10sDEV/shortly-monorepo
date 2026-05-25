// Source - https://stackoverflow.com/a
// Posted by Bourne, modified by community. See post 'Timeline' for change history
// Retrieved 2025-12-16, License - CC BY-SA 3.0

import logger from './logger.js'

export const isJson = (str: string) => {
  try {
    JSON.parse(str)
  } catch (error) {
    logger.error(`JSON Parsing failed for ${str}`, error)
    return false
  }
  return true
}
