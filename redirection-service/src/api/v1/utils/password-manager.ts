import { hash, verify } from 'argon2'
import logger from './logger.js'
/**
 * Generates a hash for the provided string
 *
 * @param plainText plain-text input to be hashed
 *
 * @returns generated hash for the provided string
 */
export const hashPassword = async (plainText: string) => {
  try {
    const hashedPassword = await hash(plainText)
    return hashedPassword
  } catch (error) {
    logger.error('SHORT-URL API SERVICE - Error Hashing Password', error)
    return null
  }
}

/**
 * Checks whether the generated digest from plain-text matches the parameters of the hashed-text
 *
 * @param plainText plain-text input to be verified
 * @param hashedText hashed input to be verified against
 *
 * @returns boolean whether the hash generated from plain-text matches the hashed input
 */
export const verifyPassword = async (plainText: string, hashedText: string) => {
  try {
    const isValid = await verify(hashedText, plainText)
    return isValid
  } catch (error) {
    logger.error('SHORT-URL API SERVICE - Error Hashing Password', error)
    return null
  }
}
