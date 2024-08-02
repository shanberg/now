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

```bash
git clone https://github.com/shanberg/frame-md.git
cd frame-md
```

To start Frame-MD, run:

```bash
deno task dev
```

## Usage

FocusFrame provides a set of commands to manage your focus frames.

- `focus tui`: Start the TUI (Text User Interface)
- `focus status`: Display the current status
- `focus complete`: Complete the current frame
- `focus add <items>`: Add nested frames
- `focus later <items>`: Add follow-up frames
- `focus edit <newName>`: Edit the current frame's description
- `focus switch <index>`: Switch to a different frame
