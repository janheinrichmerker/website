# heinrichreimer.github.io
My personal portfolio website which can be found
[here](https://heinrichreimer.com).

## Update:
Even though I cloned my portfolio and made a jekyll site from it,
I won't be able to use it as my main portfolio page unfortunately.
The reason is that GitHub pages currently
[don't support HTTPS for custom domains](https://github.com/isaacs/github/issues/156)
so I can't link it to
[**https**://heinrichreimer.com](https://heinrichreimer.com) -
and of course I want all my websites to be encrypted.

## Update #2
[My website](https://heinrichreimer.com)
is now built by cloning this repo and then executing Jekyll locally.
Not very integrated in GitHub, but whatever...
BTW I use [LetsEncrypt](https://letsencrypt.org) for HTTPS encryption
and you should too!

## Update #3
Updating the portfolio using that _"manual"_ method has always been
a pain in the a** and because of that I haven't found
much time (and motivation) to update the portfolio
to include my new projects.

Well, I've now made a bash script (two to be precise) to simplify
that workflow:
- [`build.sh`](build.sh) which builds the static sites
  using [Jekyll](https://jekyllrb.com/) and checks the HTML output
  using [html-proofer](https://github.com/gjtorikian/html-proofer).
- [`refresh-portfolio.sh`](https://gist.github.com/heinrichreimer/0bee5be4af58d316e5fda61b82fd3d29)
  which runs on my web server, pulls the GitHub repo, launches
  the build script and then - if everything worked as expected -
  deploys the updated site to my servers Apache directory.

So now updating my portfolio is as simple as
typing `./refresh-portfolio.sh` into SSH :+1:
