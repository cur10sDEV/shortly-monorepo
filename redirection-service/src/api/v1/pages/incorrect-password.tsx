import type { FC } from 'hono/jsx'

export const IncorrectPasswordPage: FC = () => {
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
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"></circle>
          </svg>
        </div>

        <h1>Incorrect password</h1>
        <p>The password you entered for this protected link is invalid. Please double-check and try again.</p>

        <button onclick="history.back()" class="btn">
          Try Again
        </button>

        <a href="/" class="sub-link">
          Return Home
        </a>
      </div>
    </>
  )
}
