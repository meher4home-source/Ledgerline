# Ledgerline test plan

## A. Demo test (open demo.html in a browser, no server)
| # | Do this | Expect |
|---|---|---|
| 1 | Open demo.html | One screen: Google button, email, password, one "Continue" button |
| 2 | Email "bad", any password, Continue | "Please enter a valid email." |
| 3 | Valid email, password "123" | "Password needs 8 or more characters." |
| 4 | Click Show | Password visible |
| 5 | New email + 8+ char password, Continue | Account created, one setup screen (no second signup step) |
| 6 | Look at Country | Already selected for you |
| 7 | Choose India | Cards show Growth ₹1,499 and Firm ₹4,999 |
| 8 | Pick "CA, accountant or bookkeeper", leave business name empty, Continue | Dashboard, name shows "My business", banner "14 days left" |
| 9 | Financial statements | Net profit ₹780.00, Cash ₹4,670.00, Total assets = Total = ₹6,086.00 |
| 10 | Invoices: `Consulting, 2, 100`, tax 18 | INV-0003, ₹236.00 |
| 11 | Cash book: Money out, Rent, 100 | Entry listed |
| 12 | Deadlines | India list with GSTR-3B |
| 13 | Clients: add "Zeta", Open | "Books of: Zeta", all ₹0.00; own books unchanged |
| 14 | Sign out, same email + wrong password | "Wrong password for this email..." |
| 15 | Same email + right password | Straight to dashboard, no setup screen |
| 16 | New email, "business owner" | No Clients tab |

## B. Real test (after Supabase + Vercel setup)
| # | Do this | Expect |
|---|---|---|
| 1 | New email signup | Straight to setup screen (no email step) |
| 2 | Continue with Google | Setup screen, not the homepage |
| 3 | Forgot password | Reset email, new password works |
| 4 | Add invoice, refresh | Data still there |
| 5 | Second account | Cannot see first account's data |
| 6 | Dodo test payment, same email | Banner shows plan active |
| 7 | Set trial_ends_at to a past date in Supabase | Adding data is refused |
| 8 | Growth account | Cannot add clients |
