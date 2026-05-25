import type { Session, User } from 'better-auth'

export type Environment = {
  Variables: {
    user: User
    session: Session
  }
}
