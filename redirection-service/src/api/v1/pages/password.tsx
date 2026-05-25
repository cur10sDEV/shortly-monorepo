import type { FC } from 'hono/jsx'

interface IPasswordPageProps {
  short_url_code: string
}

export const PasswordPage: FC<IPasswordPageProps> = ({ short_url_code }) => {
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
          </svg>
        </div>

        <h1>Link is Protected</h1>
        <p>This destination requires a password for access. Please enter the correct key to proceed.</p>

        <form action="/api/v1/short-url/password" method="post">
          <div class="input-group">
            <input
              type="password"
              name="password"
              placeholder="Enter Password"
              required
              autocomplete="off"
              aria-label="Link Password"
            />
            <input id="short_url_code" name="short_url_code" type="hidden" value={short_url_code} />
          </div>

          <button type="submit" class="btn">
            Unlock Link
          </button>
        </form>
      </div>
    </>
  )
}
