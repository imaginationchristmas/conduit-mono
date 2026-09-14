import { expect, test, type Page } from "@playwright/test"

const audits = new WeakMap<
  Page,
  { unexpectedRequests: string[]; errors: string[] }
>()

test.beforeEach(async ({ page }) => {
  const unexpectedRequests: string[] = []
  const errors: string[] = []
  audits.set(page, { unexpectedRequests, errors })
  const allowedOrigins = new Set([
    "http://127.0.0.1:7070",
    "http://127.0.0.1:7071",
  ])
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (
      !allowedOrigins.has(url.origin) ||
      url.pathname.includes("/packages/core/") ||
      url.pathname.includes("/apps/market/src/")
    ) {
      unexpectedRequests.push(
        `${request.method()} ${url.origin}${url.pathname}`
      )
    }
  })
  page.on("websocket", (socket) => {
    const url = new URL(socket.url())
    if (url.origin !== "ws://127.0.0.1:7070")
      unexpectedRequests.push(`WebSocket ${url.origin}`)
  })
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.addInitScript(() => {
    const violations: string[] = []
    Object.assign(window, { studyPolicyViolations: violations })
    document.addEventListener("securitypolicyviolation", (event) =>
      violations.push(event.violatedDirective)
    )
  })
})

test.afterEach(async ({ page }) => {
  // Include attempted connections blocked by CSP, not only completed requests.
  const audit = audits.get(page)!
  expect(
    audit.unexpectedRequests,
    "Study must not load production modules or contact external services"
  ).toEqual([])
  expect(audit.errors, "No browser runtime errors").toEqual([])
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { studyPolicyViolations: string[] })
          .studyPolicyViolations
    )
  ).toEqual([])
})

// The retro entry screens gate the market on the first load of a session, so
// tests that want the market walk the full "Press Start" path: title card,
// then discovery, then "Browse all items".
async function enterMarket(page: Page, url = "/") {
  await page.goto(url)
  const entry = page.locator("[data-start-screen]")
  await entry.waitFor({ state: "attached" })
  if ((await entry.getAttribute("data-open")) === "true") {
    await page.getByRole("button", { name: "Press Start" }).click()
    await page.getByRole("button", { name: "Browse all items" }).click()
    await expect(entry).toHaveAttribute("data-open", "false")
  }
}

test("Press Start opens discovery, Skip intro goes straight to the market", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  const entry = page.locator("[data-start-screen]")
  await expect(entry).toHaveAttribute("data-open", "true")
  await expect(entry).toHaveAttribute("data-entry-panel", "title")
  await expect(page.getByRole("button", { name: "Press Start" })).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath("title.png"),
    animations: "disabled",
  })

  // "Press Start" advances to discovery rather than straight to the market.
  await page.getByRole("button", { name: "Press Start" }).click()
  await expect(entry).toHaveAttribute("data-entry-panel", "discovery")
  await expect(
    page.getByRole("heading", { name: "What are you looking for?" })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: /^Clothing/ })).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath("discovery.png"),
    animations: "disabled",
  })

  // Typing narrows the auto-populated merchant chips.
  const entrySearch = page.getByRole("searchbox", {
    name: "Search sample products",
  })
  await entrySearch.fill("paper")
  await expect(page.getByRole("button", { name: /Paper & Ink/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /Common Thread/ })).toHaveCount(
    0
  )

  // A merchant chip opens the market filtered to that shop. Paper & Ink has
  // three fixtures, so the shop filter must carry across the handoff.
  await page.getByRole("button", { name: /Paper & Ink/ }).click()
  await expect(entry).toHaveAttribute("data-open", "false")
  await expect(
    page.getByRole("list", { name: "Sample products" })
  ).toBeVisible()
  await expect(page.getByText("3 sample products")).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Shop" })).toContainText(
    "Paper & Ink"
  )

  // Same-session reload skips the intro entirely.
  await page.reload()
  await expect(page.locator("[data-start-screen]")).toHaveAttribute(
    "data-open",
    "false"
  )
})

test("skip intro bypasses discovery and shows the full catalog", async ({
  page,
}) => {
  await page.goto("/")
  const entry = page.locator("[data-start-screen]")
  await expect(entry).toHaveAttribute("data-entry-panel", "title")
  await page.getByRole("button", { name: "Skip intro" }).click()
  await expect(entry).toHaveAttribute("data-open", "false")
  await expect(
    page.getByRole("heading", { name: "What are you looking for?" })
  ).toHaveCount(0)
  await expect(page.getByText("12 sample products")).toBeVisible()
})

test("sample catalog and screenshot fit the viewport", async ({
  page,
}, testInfo) => {
  await enterMarket(page)
  await expect(
    page.getByRole("list", { name: "Sample products" })
  ).toBeVisible()
  await expect(page.locator("[data-product-id]")).toHaveCount(12)
  await expect(
    page.getByText("No image available", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Weekend long-sleeve is sold out" })
  ).toBeDisabled()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: testInfo.outputPath("catalog.png"),
    animations: "disabled",
    fullPage: true,
  })
})

test("category, shop, sort, find-item, and empty recovery use fixtures", async ({
  page,
}) => {
  await enterMarket(page)
  // Category, Shop, Sort, Find an item, and Reset all live in the left HUD
  // rail; the header is brand-only now.
  // Category is a dropdown now; pick Clothing, then back to all.
  await page.getByRole("combobox", { name: "Category" }).click()
  await page.getByRole("option", { name: "Clothing", exact: true }).click()
  await expect(page.locator("[data-product-id]")).toHaveCount(3)
  await page.getByRole("combobox", { name: "Category" }).click()
  await page.getByRole("option", { name: "All products", exact: true }).click()
  await page.getByRole("combobox", { name: "Shop", exact: true }).click()
  await page.getByRole("option", { name: "Early Bird", exact: true }).click()
  await expect(page.locator("[data-product-id]")).toHaveCount(2)
  await page.getByRole("combobox", { name: "Sort", exact: true }).click()
  await page
    .getByRole("option", { name: "Price: low to high", exact: true })
    .click()
  await expect(page.locator("[data-product-id]").first()).toHaveAttribute(
    "data-product-id",
    "tea"
  )

  // An impossible category + shop pair lands on the empty state, which Reset
  // filters recovers from.
  await page.getByRole("combobox", { name: "Category" }).click()
  await page.getByRole("option", { name: "Food & drink", exact: true }).click()
  await page.getByRole("combobox", { name: "Shop", exact: true }).click()
  await page.getByRole("option", { name: "Paper & Ink", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "No products found" })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .first()
    .click()
  await expect(page.locator("[data-product-id]")).toHaveCount(12)

  // "Find an item" type-ahead: picking a product narrows the market to it.
  const findBox = page.getByRole("combobox", { name: "Find an item" })
  await findBox.click()
  await findBox.fill("tote")
  await page.getByRole("option", { name: /Carry-all canvas tote/ }).click()
  await expect(page.locator("[data-product-id]")).toHaveCount(1)
  await expect(page.locator("[data-product-id]")).toHaveAttribute(
    "data-product-id",
    "tote"
  )
})

test("collect into the item box, review in the rail, and centered checkout", async ({
  page,
}) => {
  await enterMarket(page)
  // Collect with an option chosen.
  await page
    .getByRole("combobox", { name: "Option for Everyday cotton tee" })
    .click()
  await page.getByRole("option", { name: "Large", exact: true }).click()
  await page
    .getByRole("button", { name: "Collect Everyday cotton tee" })
    .click()
  // Collecting the same item again stacks it (count 2, still one slot).
  await page
    .getByRole("button", { name: "Collect Everyday cotton tee" })
    .click()
  await expect(
    page.getByRole("button", { name: "Review found items, 2 total" })
  ).toBeVisible()
  const review = page.getByRole("button", {
    name: "Review found items, 2 total",
  })
  await expect(review).toBeVisible()
  // Review expands inline in the right rail — no overlay dialog.
  await review.click()
  const list = page.locator("#found-items-list")
  await expect(list).toBeVisible()
  await expect(
    list.getByText("Everyday cotton tee", { exact: true })
  ).toBeVisible()
  // Remove one unit: the stack drops back to 1.
  await list
    .getByRole("button", { name: "Remove one Everyday cotton tee" })
    .click()
  await expect(
    page.getByRole("button", { name: "Review found items, 1 total" })
  ).toBeVisible()
  // Clear empties the box entirely.
  await page.getByRole("button", { name: "Clear found items" }).click()
  await expect(
    page.getByRole("button", { name: "Review found items, 0 total" })
  ).toBeVisible()
  await expect(list).toHaveCount(0)
  // Re-collect for the checkout leg of the test.
  await page
    .getByRole("button", { name: "Collect Everyday cotton tee" })
    .click()
  await page
    .getByRole("button", { name: "Review found items, 1 total" })
    .click()
  await expect(list).toBeVisible()
  // Check out opens the centered overlay; the grid hides behind it.
  await list.getByRole("button", { name: "Check out (pretend)" }).click()
  const checkout = page.getByRole("dialog", { name: "Checkout" })
  await expect(checkout).toBeVisible()
  await expect(page.locator(".study-grid")).toBeHidden()
  await expect(
    checkout.getByText("Everyday cotton tee", { exact: true }).last()
  ).toBeVisible()
  // Pay (pretend) closes the overlay and returns to the market.
  await checkout.getByRole("button", { name: "Pay (pretend)" }).click()
  await expect(checkout).toHaveCount(0)
  await expect(page.locator(".study-grid")).toBeVisible()
  // Product detail dialog still opens and restores focus on close.
  const product = page.getByRole("button", {
    name: "View Hand-thrown everyday mug",
  })
  await product.click()
  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByRole("heading", { name: "Hand-thrown everyday mug" })
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(product).toBeFocused()
  // Session-only: the box resets on reload.
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Review found items, 0 total" })
  ).toBeVisible()
})

test("theme cycles and persists without login; both appearances fit", async ({
  page,
}, testInfo) => {
  await enterMarket(page)
  // The study defaults to dark (night-market) until the visitor picks a theme.
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    "night-market"
  )
  // Dark -> System: resolves to the device scheme (day on the phone project,
  // night on the desktop project).
  await page
    .getByRole("button", {
      name: "Appearance: Dark. Switch to System",
      exact: true,
    })
    .click()
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    testInfo.project.use.colorScheme === "dark" ? "night-market" : "day-market"
  )
  await page.screenshot({
    path: testInfo.outputPath("system-appearance.png"),
    animations: "disabled",
    fullPage: true,
  })
  // System -> Light: the explicit day theme.
  await page
    .getByRole("button", {
      name: "Appearance: System. Switch to Light",
      exact: true,
    })
    .click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day-market")
  await page.screenshot({
    path: testInfo.outputPath("day-market.png"),
    animations: "disabled",
    fullPage: true,
  })
  // Light -> Dark, then reload: the explicit choice persists.
  await page
    .getByRole("button", {
      name: "Appearance: Light. Switch to Dark",
      exact: true,
    })
    .click()
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    "night-market"
  )
  await page.reload()
  await expect(
    page.getByRole("button", {
      name: "Appearance: Dark. Switch to System",
      exact: true,
    })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.screenshot({
    path: testInfo.outputPath("night-market.png"),
    animations: "disabled",
    fullPage: true,
  })
})

test("settings rail toggles persist and change the market surface", async ({
  page,
}) => {
  await enterMarket(page)

  // Store labels are on by default; turning them off removes them from tiles.
  await page
    .getByRole("switch", { name: "Store labels on product tiles" })
    .click()
  // p.study-label is the store name; span.study-label is the artwork caption.
  await expect(page.locator(".study-card p.study-label")).toHaveCount(0)

  // Picture view packs the wall and hides the tile details (title/price/add).
  await page.getByRole("button", { name: "Picture", exact: true }).click()
  await expect(page.locator('.study-grid[data-tile="picture"]')).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Collect Everyday cotton tee" })
  ).toHaveCount(0)
  // The cover-art tile is still an accessible "View …" control.
  await expect(
    page.getByRole("button", { name: "View Everyday cotton tee" })
  ).toBeVisible()

  // The pixel-field dials are retired: the tuned values are baked in as fixed
  // defaults, so no tuning control appears in the dock.
  await expect(page.getByRole("button", { name: "Field tuning" })).toHaveCount(
    0
  )
  // Scanlines render a cosmetic overlay above the market.
  await page.getByRole("switch", { name: "CRT scanlines" }).click()
  await expect(page.locator(".study-scanlines")).toBeAttached()

  // Settings persist across a reload (localStorage, clamped on read).
  await page.reload()
  await expect(page.locator("[data-start-screen]")).toHaveAttribute(
    "data-open",
    "false"
  )
  await expect(page.locator(".study-card p.study-label")).toHaveCount(0)
  await expect(page.locator(".study-scanlines")).toBeAttached()

  // Reset restores the defaults: labels back, info view, no scanlines.
  await page.getByRole("button", { name: "Reset to defaults" }).click()
  await expect(page.locator(".study-card p.study-label").first()).toBeVisible()
  await expect(page.locator('.study-grid[data-tile="info"]')).toBeVisible()
  await expect(page.locator(".study-scanlines")).toHaveCount(0)
})

test("filters drive the result count and empty state", async ({ page }) => {
  await enterMarket(page)
  await expect(page.locator("[data-product-id]")).toHaveCount(12)
  // A filter that matches nothing shows the empty state; reset recovers.
  await page.getByRole("combobox", { name: "Category" }).click()
  await page.getByRole("option", { name: "Clothing", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "No products found" })
  ).toBeHidden()
  await page.getByRole("combobox", { name: "Shop", exact: true }).click()
  await page.getByRole("option", { name: "Paper & Ink", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "No products found" })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .first()
    .click()
  await expect(page.locator("[data-product-id]")).toHaveCount(12)
})

test("built page also runs without production services", async ({ page }) => {
  await enterMarket(page, "http://127.0.0.1:7071/")
  await expect(page.locator("[data-product-id]")).toHaveCount(12)
  await page
    .getByRole("button", { name: "Collect Carry-all canvas tote" })
    .click()
  await page
    .getByRole("button", { name: "Review found items, 1 total" })
    .click()
  await expect(page.locator("#found-items-list")).toBeVisible()
  await page
    .getByRole("button", { name: "Review found items, 1 total" })
    .click()
  await expect(page.locator("#found-items-list")).toHaveCount(0)
  // Dark -> System -> Light: two clicks land on the explicit day theme.
  await page
    .getByRole("button", {
      name: "Appearance: Dark. Switch to System",
      exact: true,
    })
    .click()
  await page
    .getByRole("button", {
      name: "Appearance: System. Switch to Light",
      exact: true,
    })
    .click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day-market")
})
