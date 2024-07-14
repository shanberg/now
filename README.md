<!-- README.md -->

# Frame-MD

This project is heavily inspired by [Frame](https://github.com/lelanthran/frame/tree/master), and implements a similar behavior using a CLI and data stored in a markdown file for greater accessibility.

***

Frame-MD is a terminal-based, minimal productivity tool for keeping track of what you're working on.

- A "frame" is a chunk of work you can focus on.
- If the current frame is unclear or too broad, create a new frame inside it.
- When done, complete the current frame to move to the next, or up to the parent frame. Completed frames are DELETED, and completing a parent frame will delete its descendents.
- The current set of frames are stored in a local Markdown file. `./frame.md` by default.

***

## Installation

1. Ensure you have [Deno](https://deno.land/) installed.
2. Clone this repository:

```
git clone https://github.com/shanberg/frame-md.git
cd frame-md
```

To start Frame-MD, run:

```
./run.sh
```

