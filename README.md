<!-- README.md -->

# Now

This project is heavily inspired by
[Frame](https://github.com/lelanthran/frame/tree/master), and implements a
similar behavior using a CLI and data stored in a markdown file for greater
accessibility.

---

Now is a terminal-based, minimal productivity tool for keeping track of
what you're working on, in a readable local text file.

- A "focus" is a chunk of work you can get done without having to break it
  down further.
- If your current focus is unclear or too broad, focus on something smaller.
- When you're done, complete the current focus to move to the next thing.
- Completed items are _deleted_, and _completing a parent focus will
  delete its descendents_.
- The `*.now.md` file is named for the folder it was made in.
