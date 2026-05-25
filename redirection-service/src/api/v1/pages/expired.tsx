import type { FC } from 'hono/jsx'

export const ExpiredLinkPage: FC = () => {
  return (
    <>
      <div class="orb"></div>

      <div class="container">
        <div class="icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </div>

        <h1>This link has expired</h1>
        <p>The time limit for this URL has passed, or the link has been deactivated by the creator.</p>

        <a href="/" class="btn">
          Return Home
        </a>
      </div>
    </>
  )
}
