# Ledgerline test plan (numbers are ones you type yourself; the app shows no fake data)

## A. Private demo (open demo.html in a browser)
| # | Do this | Expect |
|---|---|---|
| 1 | Open demo.html | Heading "Create your account", tabs Sign up / Log in, link "Already have an account? Log in" |
| 2 | Click Log in tab | Heading "Welcome back", "Forgot password?" appears |
| 3 | Sign up tab, email "bad" | "Please enter a valid email." |
| 4 | Valid email, password "123" | "Password needs 8 or more characters." |
| 5 | Valid email, 8+ char password, Create account | Setup screen, country already chosen |
| 6 | Pick India | Growth ₹1,499, Firm ₹4,999 |
| 7 | Continue | Dashboard, "Start here" box, everything ₹0.00 |
| 8 | Invoices: `Consulting, 2, 100`, tax 18 | INV-0001, ₹236.00 |
| 9 | Cash book: Money in, Owner capital, 1000. Then Money out, Rent, 80 | Both listed |
| 10 | Financial statements | Net profit ₹120.00, Cash ₹920.00, Owed to you ₹236.00, Total assets = Total = ₹1,156.00 |
| 11 | Invoices: Mark paid | Owed ₹0.00, Cash ₹1,156.00 |
| 12 | Deadlines | Your country's list |
| 13 | (Firm) Clients: add "Zeta", Open | "Books of: Zeta", all ₹0.00 |
| 14 | Sign out, Log in tab, wrong password | "Wrong email or password. New here? Tap Sign up." |
| 15 | Sign up tab with existing email | Switches to Log in: "already has an account" |

### Insights and CSV (after steps 8 to 11 above)
| # | Do this | Expect |
|---|---|---|
| 16 | Open Insights | Last 6 months table, Budget, Cash forecast, Who owes you, Health check, Download |
| 17 | Budget: Rent, 100, Save | Rent row: Budget ₹100, Spent ₹80, Left ₹20 |
| 18 | Cash forecast | First month closing cash ₹1,312.00 (1,156 + 236 income - 80 spending) |
| 19 | Download the three CSV buttons | Files open in Excel with the ₹ sign intact |
| 20 | Cash book: Import CSV with columns Date, Description, Amount (negative = money out) | Rows appear, duplicates skipped, balance sheet still balances |

## B. Real site
| # | Do this | Expect |
|---|---|---|
| 0 | Open /check | Every line green |
| 1 | Sign up with email | Straight to setup (no email step) |
| 2 | Continue with Google | Setup screen |
| 3 | Add an invoice, refresh | Data still there |
| 4 | Second account | Cannot see first account's data |
| 5 | Dodo test payment, same email | Banner shows plan active |
