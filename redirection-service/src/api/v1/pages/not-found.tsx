import type { FC } from 'hono/jsx'

export const NotFoundPage: FC = () => {
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
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>{' '}
          </svg>
        </div>

        <h1>Link not found</h1>
        <p>
          We couldn't find a short link with this URL. It may have been deleted, or there might be a typo in the
          address.
        </p>

        <a href="/" class="btn">
          Create a new link
        </a>

        <a href="/contact" class="sub-link">
          Report a problem
        </a>
      </div>
    </>
  )
}
