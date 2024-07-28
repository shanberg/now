<!-- README.md -->

# FocusFrame

This project is heavily inspired by
[Frame](https://github.com/lelanthran/frame/tree/master), and implements a
similar behavior using a CLI and data stored in a markdown file for greater
accessibility.

---

FocusFrame is a terminal-based, minimal productivity tool for keeping track of
what you're working on.

- A "focus frame" is a chunk of work you can get done without having to break it
  down further.
- If the current focus frame is unclear or too broad, create a new one inside
  it.
- When done, complete the current frame to move to the next, or up to the parent
  frame. Completed frames are _deleted_, and _completing a parent frame will
  delete its descendents_.
- The current set of frames are stored in a local Markdown file. `*.frame.md` by
  default.

---

## Installation

1. Ensure you have [Deno](https://deno.land/) installed.
2. Clone this repository:

```
git clone https://github.com/shanberg/frame-md.git
cd frame-md
```

To start Frame-MD, run:

...
