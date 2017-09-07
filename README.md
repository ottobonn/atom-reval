# atom-reval

Use [reval](https://github.com/qualialabs/reval) from Atom with convenient,
customizable keybindings.

## Configuration

By default, `atom-reval` assumes your `reval` server is running on `localhost`,
port `3000`.

To specify a different server, add a `.revalrc` file to your
project directory with the hostname and port separated by a colon, like this:

    different.dev:3333

For a given file open in Atom, `atom-reval` will use the first `.revalrc` file
above it in the directory tree.
