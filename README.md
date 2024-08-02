<!-- README.md -->

# Now

This project is heavily inspired by
[Frame](https://github.com/lelanthran/frame/tree/master), and implements a
similar behavior using a CLI and data stored in a markdown file for greater
accessibility.

---

Now is a terminal-based, minimal productivity tool for keeping track of
what you're working on.

- A "focus" is a chunk of work you can get done without having to break it
  down further.
- If the current focus is unclear or too broad, create a new one inside
  it.
- When done, complete the current focus to move to the next, or up to the parent
  focus. Completed focuses are _deleted_, and _completing a parent focus will
  delete its descendents_.
- The current set of focuses are stored in a local Markdown file. `*.now.md` by
  default.
