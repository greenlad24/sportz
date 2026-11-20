# Motion graphics and launch/promo videos made with code: frameworks, showcases, galleries

Research method note: done on 2026-11-20 with web search plus GitHub fetches. **remotion.dev and www.remotion.dev could not be fetched**: DNS failed because the hosts are outside this cloud session's allowed network. Remotion showcase details therefore come from search snippets, the GitHub README and mirrors, not from the live page. URLs marked "(not verified this session)" come from general knowledge. Every page they name is a long-standing official one, but none was fetched or found in search here.

## Which frameworks have official showcase pages, and what tech-company videos appear there?

### Takeaway
Remotion has the clearest official showcase (remotion.dev/showcase). It lists products, campaigns, launch videos, tutorials and creative tools, and its flagship examples are GitHub Unwrapped and the Fireship "made with code" video. Manim (manim.community/awesome) and Motion Canvas (an examples repo) have community or official example collections. Revideo points to an examples repo. Theatre.js gathers showcase material through its GitHub README rather than a gallery page. Commercial "video-as-API" tools (Shotstack, Editframe, Twick) have product pages but no rich public showcases of brand launch videos.

### Cited Findings
**Remotion (React → MP4)**
- The official showcase lives at remotion.dev/showcase. Its index describes it as listing "products, campaigns, launch videos, tutorials and creative tools made with Remotion" — [Remotion showcase (search index)](https://www.remotion.dev/showcase/)
- The Remotion README links Showcase (remotion.dev/showcase) and Templates (remotion.dev/templates). It now advertises "Make videos agentically: Turn your idea into a video using your agent", with Agent Skills docs at remotion.dev/docs/ai/skills and "Ask AI" at remotion.dev/ai. The repo contains `.claude` and `.agents/skills` folders — [GitHub remotion-dev/remotion](https://github.com/remotion-dev/remotion)
- The README's two headline showcase videos are a Fireship video (source: github.com/wcandillon/remotion-fireship) and GitHub Unwrapped (source: github.com/remotion-dev/github-unwrapped) — [Remotion README mirror](https://cdn.jsdelivr.net/gh/remotion-dev/remotion@main/README.md)
- The Remotion resources page lists GitHub Unwrapped 2021, 2022 and 2023+2024 as full open-source projects, plus a Fireship Remotion tutorial — [Remotion resources](https://www.remotion.dev/docs/resources)
- Remotion's Product Hunt "customers" page has makers saying their launch videos were made with Remotion. Examples include a browser company that coded its launch video in it and MindPal, which credits Remotion for its launch demo video and motion assets. These are user-generated listings — [Product Hunt: Remotion customers](https://www.producthunt.com/products/remotion/customers)
- RemotionUI showcase: videos built from RemotionUI components, including a 34-second RemotionUI launch film and an *unofficial* Supabase demo (the page says it is not affiliated with Supabase) — [RemotionUI showcase](https://remotionui.com/showcase)

**Motion Canvas / Revideo (TypeScript, canvas-based)**
- The official `motion-canvas/examples` repo is a set of videos made with Motion Canvas. Examples include "Could This Asset Be Code", "Deferred Lights", "Motion Canvas Logo", an anniversary video and "Smooth Parallax" — [motion-canvas/examples README](https://github.com/motion-canvas/examples/blob/master/README.md); a community set is at [GaryCraft/examples](https://github.com/GaryCraft/examples)
- I found no official "showcase" page on motioncanvas.io and no awesome-motion-canvas list. One comparison commenter said the domain returned NXDOMAIN and the repo looked stale, so the project's status is uncertain — [LibHunt manim vs motion-canvas](https://www.libhunt.com/compare-ManimCommunity--manim-vs-motion-canvas)
- Revideo is a fork of Motion Canvas with a largely shared animation API. Its docs send users to the Motion Canvas guide — [Revideo docs](https://docs.re.video/designing-animations). Examples live in redotvideo/revideo-examples (contents not verified) — [awesome.ecosyste.ms: revideo](https://awesome.ecosyste.ms/projects/github.com%2Fredotvideo%2Frevideo); YC launch page: [Revideo – create videos with code](https://www.ycombinator.com/launches/Kq1-revideo-create-videos-with-code)
- A 2026 comparison covers Remotion vs Motion Canvas vs Revideo — [PkgPulse guide](https://www.pkgpulse.com/guides/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026)

**HyperFrames (HeyGen, HTML → MP4, agent-first)**
- HyperFrames is an Apache-2.0 open-source framework. It renders HTML, CSS, media and seekable animations to MP4 with headless Chrome and FFmpeg. It is a rendering engine, not HeyGen's avatar product — [themenonlab.blog](https://themenonlab.blog/blog/heygen-hyperframes-video-as-code); HeyGen research page: [heygen.com/research/html-to-video](https://www.heygen.com/research/html-to-video)
- It was open-sourced on 2026-04-17 and ships agent skills (`npx skills add heygen-com/hyperframes`) for Claude Code, Cursor and Gemini CLI — [noqta.tn](https://noqta.tn/en/blog/heygen-hyperframes-html-to-mp4-ai-agent-video-2026); [themenonlab.blog (Claude Code)](https://themenonlab.blog/blog/hyperframes-claude-code-writes-renders-videos)
- HeyGen engineer James Russo's talk "HTML is all agents need" argues that agents already know HTML/CSS/JS — [AI Engineer talk](https://ai.engineer/talks/html-is-all-agents-need)

**Manim (Python, math animation)**
- The Manim Community showcase is at manim.community/awesome. It is fed by the ManimCommunity/awesome-manim repo, which auto-crawls listed YouTube channels. 3Blue1Brown is listed. The community edition is a fork of 3b1b/manim and is not associated with Grant Sanderson — [awesome-manim](https://www.github.com/ManimCommunity/awesome-manim); [awesome.ecosyste.ms: manim](https://awesome.ecosyste.ms/projects/github.com%2Fmanimcommunity%2Fmanim)
- 3Blue1Brown's actual video source code is public in the 3b1b/videos repo — [awesome.ecosyste.ms: 3b1b/videos](https://awesome.ecosyste.ms/projects/github.com%2F3b1b%2Fvideos)

**Theatre.js**
- Theatre.js ("Motion Design, for the web", theatrejs.com) has no dedicated gallery. Its README invites creators to submit tutorials and video content "to showcase it here" — [theatre-js/theatre](https://github.com/theatre-js/theatre); [theatrejs.com](https://theatrejs.com/)

**Rive / Lottie**
- Rive is a runtime for interactive vector animation driven by runtime inputs. Lottie is playback-oriented with a large marketplace (LottieFiles), and many teams use both — [LottieFiles blog: LottieFiles or Rive](https://lottiefiles.com/blog/working-with-lottie-animations/lottiefiles-or-rive); [rive.app/features](https://rive.app/features)
- LottieFiles added a native State Machine (dotLottie state machines) to its web Lottie Creator, plus generative-AI features (March 2026 article) — [LottieFiles blog](https://lottiefiles.com/blog/lottie-animations/lottiefiles-or-rive)
- Rive case studies are on its blog, e.g. the "Octopus Garden" interactive experience — [Rive blog](https://framer.rive.app/blog/burning-man-ai-robots-and-underwater-dreams); [blog.rive.app](https://blog.rive.app)

**Video-as-API / SDKs**
- Shotstack: a JSON-driven cloud video editing API that markets itself as "video as code" — [Shotstack video-as-code](https://shotstack.io/solutions/video-as-code/); [Shotstack product](https://shotstack.io/product/)
- Editframe renders video from HTML/CSS and assembles existing assets, rather than generating footage from prompts. One review calls Remotion its "closest philosophical cousin" — [Motionbox: Editframe alternatives 2026](https://motionbox.io/blog/best-editframe-alternatives-in-2026)
- Twick is an open-source React video editor SDK with browser MP4 rendering and a Node/Puppeteer/FFmpeg render server — [Twick (GitHub fork)](https://github.com/awch-D/Twick)

**Official showcase pages not verified this session** (well-known; not fetched or confirmed by search):
- GSAP showcase: https://gsap.com/showcase (not verified this session)
- Three.js homepage project gallery: https://threejs.org (not verified this session); React Three Fiber showcase: https://docs.pmnd.rs/react-three-fiber/getting-started/examples (not verified this session)
- Motion (ex-Framer Motion) examples: https://motion.dev/examples (not verified this session)
- LottieFiles featured animations: https://lottiefiles.com/featured (not verified this session); Rive Marketplace/Community: https://rive.app/community (not verified this session)
- p5.js showcase: https://p5js.org/showcase (not verified this session)
- Jitter (browser motion design tool, not code-based) — no search result found

### Inferences
- Remotion's showcase is the only framework gallery that explicitly carries "launch videos" as a category, which makes it the main official source for code-made tech launch films.
- Most frameworks other than Remotion and Manim rely on GitHub example repos rather than curated galleries.

### Gaps
- I could not read the actual entries on remotion.dev/showcase (host blocked), so I can't name which tech-company launch videos appear there beyond the README's Fireship and GitHub Unwrapped.
- I didn't verify the current contents of the GSAP, Three.js, R3F, Motion.dev, LottieFiles, Rive or p5.js showcases.
- I found nothing on Jitter.

## Which known launch/promo videos of tech companies were made in code?

### Takeaway
The best-documented cases are Remotion's own projects. GitHub Unwrapped is a yearly personalized "year in review" video built with Remotion and AWS Lambda, made by the Remotion team, not by GitHub. Fireship's "This video was made with code. But how?" was coded by William Candillon with Remotion. Beyond those, confirmed brand launch films made in code are mostly smaller companies (Superame via Dardo, MindPal, Every's open-sourced launch-video skill). I could not confirm that official Vercel, Linear, Raycast or Supabase launch videos were made in code; the Supabase films found are explicitly unofficial.

### Cited Findings
- **GitHub Unwrapped** (githubunwrapped.com): Jonny Burger describes it as "essentially a demo project for my framework Remotion". The 2021 and 2022 editions use Next.js + Remotion + AWS Lambda, and 2023 uses Vite 5 + Remotion + Lambda. Render locks sit in MongoDB and videos are cached for scale. Repos: [github-unwrapped-2022](https://github.com/remotion-dev/github-unwrapped-2022), [github-unwrapped-2023](https://github.com/remotion-dev/github-unwrapped-2023), [awesome.ecosyste.ms: 2021](https://awesome.ecosyste.ms/projects/github.com%2Fremotion-dev%2Fgithub-unwrapped-2021); Product Hunt: [GitHub Unwrapped 2023](https://www.producthunt.com/p/remotion/github-unwrapped-2023)
- **Fireship: "This video was made with code. But how?"** is a Remotion tutorial that was itself rendered with Remotion. William Candillon wrote the code. Source: [wcandillon/remotion-fireship](https://awesome.ecosyste.ms/projects/github.com%2Fwcandillon%2Fremotion-fireship); transcript: [rosetta.to](https://rosetta.to/u/fireship/this-video-was-made-with-code-but-how), [sozai.app](https://sozai.app/transcript/video-made-with-code-how/)
- **Superame commercial (by Dardo studio):** a 28.8 s product commercial built with Remotion. The rendered file's metadata reads "Made with Remotion 4.0.520" — [Dardo blog](https://dardo.studio/en/blog/remotion-video/)
- **Every (EveryInc):** open-sourced "Claude Code skill + Remotion scaffold for building polished product launch videos". It covers storyboard → scenes → render → review → export of a 15–30 s video, under the MIT license. The repo lists no showcase of real videos — [EveryInc/product-launch-video](https://github.com/EveryInc/product-launch-video)
- **sub-level/marketing-videos:** "Remotion + Claude Code skills + the AI footage pipeline behind our launch films". Claude Code writes each film as a Remotion composition, including an ~80 s launch film and a "Match Day" film — [GitHub sub-level/marketing-videos](https://github.com/sub-level/marketing-videos)
- **IstiqlalBhat/product-launch-video:** an agent skill that renders launch videos from code (HyperFrames or Remotion). Example: "The Hidden Half", an *unofficial* Supabase launch film — [GitHub](https://github.com/IstiqlalBhat/product-launch-video)
- MindPal and other Product Hunt makers credit Remotion for their launch videos — [Product Hunt customers](https://www.producthunt.com/products/remotion/customers)
- A landing-page video built in 3 hours with Claude + Remotion + ElevenLabs (March 2026) — [adeelhere.com](https://adeelhere.com/blog/2026-03-30-ai-landing-page-video-claude-remotion-elevenlabs)
- A Substack note describes a hospital-focused company's announcement video made in about 15 minutes with Claude Code + a Remotion skill (anecdotal) — [Substack note](https://substack.com/@techysurgeon/note/c-231237268)

### Inferences
- "Made in code" launch videos at well-known companies are widely rumored, but public confirmation is rare. The documented examples are mostly framework vendors' own demos or small startups and studios that blog about their process.

### Gaps
- I found no source confirming that Vercel, Linear or Raycast launch videos were made with Remotion or another code framework. A targeted search turned up only unofficial or fan films. Treat any such claim as unverified unless a primary source is found.
- I couldn't access remotion.dev/showcase to check for big-brand entries.

## What are the 2025–2026 trends, and where are they showcased?

### Takeaway
2026 was the year LLM agents started writing motion graphics as code. Remotion launched official Agent Skills around January 2026. HeyGen open-sourced HyperFrames, an HTML-to-video framework built for agents, in April 2026. Anthropic launched Claude Motion, a code-driven explainer animation beta, on 2026-10-08. A large ecosystem of third-party "launch video" skills now sits on skill marketplaces. Showcases are scattered across skill directories, GitHub repos, X/YouTube creators and roundup articles; I found no single official gallery.

### Cited Findings
- **Remotion Agent Skills:** installed with `npx skills add remotion-dev/skills` (skill name: remotion-best-practices) or as a Claude Code plugin with `claude plugin marketplace add remotion-dev/claude-code-plugin`. Apidog's 2026-01-23 write-up said "Remotion just dropped Agent Skills" — [Apidog](https://apidog.com/blog/claude-code-remotion); [Medium (Joe Njenga)](https://medium.com/@joe.njenga/claude-code-can-now-create-videos-with-this-one-skill-that-i-just-tested-e8a6a40e7e89); [Tella guide](https://www.tella.com/blog/how-to-use-remotion-agent-skills-with-claude-code); David Ondrej video "Claude Code can now make videos": [recapio digest](https://recapio.com/digest/claude-code-can-now-make-videos-heres-how-by-david-ondrej)
- Tutorials note that generated layouts sometimes need manual fixes, such as text wrapping in vertical formats — [autoae.online](https://autoae.online/blog/claude-code-remotion-tutorial); logo reveals and lower thirds: [MindStudio](https://mindstudio.ai/blog/remotion-claude-code-animated-logo-reveals-motion-graphics)
- A creator claims 1M views from one Claude skill (self-reported) — [Nahid's notebook](https://nahid-s-notebook.kit.com/posts/how-i-hit-1m-views-using-one-claude-skill)
- **Third-party launch-video skills (skill directories):** [broomva/launch-video ("Liquid Glass" cinematic launch)](https://skillselion.com/skills/broomva/launch-video); [memex-lab/product-launch-video](https://www.ui-skills.com/skills/memex-lab/product-launch-video); [Amplitude launch-skills / launch-video](https://www.claudepluginhub.com/skills/amplitude-launch-skills-launch-skills/launch-video); [pedronauck promo-video](https://www.skills.sh/pedronauck/skills/promo-video); [remotion-beautiful-videos (40 s launch video from a brand URL)](https://skillselion.com/skills/norahe0304-art/remotion-video-skill/remotion-beautiful-videos); [digitalsamba claude-code-video-toolkit](https://agent-skills.md/skills/digitalsamba/claude-code-video-toolkit/remotion); [Product Demo Video skill (skilldb)](https://skilldb.dev/skills/marketing-video-skills/product-demo-video). These are unvetted third-party listings.
- A step, time and cost guide for a Claude Code + Remotion launch video. It cites a Remotion merch-drop video as the most-liked example in its archive as of October 2026 — [createmotion.io](https://createmotion.io/guides/claude-code-remotion-launch-video/)
- **HyperFrames** (April 2026), described as an agent-first HTML→MP4 framework — see section 1; reviews: [DEV: HyperFrames review](https://dev.to/andrew-ooo/hyperframes-review-heygens-html-to-video-for-ai-agents-170i); [mejba.me: HyperFrames + Claude Code](https://www.mejba.me/ai-video-creation-hyperframes-claude-code)
- **Claude Motion (Anthropic):** a beta launched 2026-10-08 alongside Claude Dashboards, for Team and Enterprise plans. It produces short, code-driven, editable explainer animations from prompts and exports MP4. Reports say Anthropic stated it does **not** use a video-generation model. These are third-party write-ups, so confirm against Anthropic's own announcement — [layer3labs guide](https://www.layer3labs.io/guides/claude-motion); [t3n test](https://t3n.de/news/claude-motion-test-anthropic-ki-animation-1769905/); [Will Francis how-to](https://willfrancis.com/how-to-use-claude-motion/); [creativeainews](https://www.creativeainews.com/articles/claude-motion-animated-explainers-2026/); [SmartScope on availability](https://smartscope.blog/en/blog/claude-motion-free-pro-max-availability-use-motion-2026/)
- An example roundup: "Claude Opus 5.5 Is Generating Incredible Animated Motion Graphic Videos: 10 Best Examples" — [OfficeChai](https://officechai.com/ai/claude-opus-5-5-motion-graphic-videos/); product launch videos with Opus 5.5: [Analytics Vidhya](https://www.analyticsvidhya.com/?p=258908)
- **Higgsfield Vibe Motion:** a no-code motion graphics tool reported to use Claude + Remotion under the hood — [LetsDataScience](https://letsdatascience.com/news/higgsfield-launches-vibe-motion-for-no-code-motion-graphics-2a75ae89)
- Open-source React video templates (SwiftClip, product-launch template) — [SwiftClip](https://swift-clip.vercel.app/templates/product-launch)

## Galleries of code-based motion (CodePen, Codrops, awesome lists, etc.)

(This section covers the objective's part (c).)

### Cited Findings
- **Codrops (tympanus.net/codrops):** a running stream of GSAP, Three.js and WebGL motion tutorials and case studies. Examples:
  - Cinematic 3D scroll experiences with GSAP (2025-11-19; ScrollTrigger/ScrollSmoother/SplitText, WebGL cylinder + particles) — [Codrops](https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/), demos at [GitHub](https://github.com/JosephASG/codrops-cinematic-scroll-animations)
  - Stas Bondar portfolio techniques (March 2025) — [Codrops](https://tympanus.net/codrops/2025/03/25/stas-bondar-25-the-code-techniques-behind-a-next-level-portfolio/)
  - Monthly archives with 2026 R3F, GSAP and WebGL builds, e.g. [Oct 2026](https://tympanus.net/codrops/2026/10/) and [Feb 2026](https://tympanus.net/codrops/2026/02/)
- **awesome-creative-coding** (terkelg): generative art, data viz, interaction design and resources — [context-awesome mirror](https://www.context-awesome.com/list/terkelg/awesome-creative-coding); [ecosyste.ms](https://awesome.ecosyste.ms/api/v1/projects/github.com%2Fterkelg%2Fawesome-creative-coding). Related lists: [jsonkao/creative-coding](https://awesome.ecosyste.ms/projects/github.com%2Fjsonkao%2Fcreative-coding) and [fucking-awesome-creative-coding](https://www.context-awesome.com/list/correia-jpv/fucking-awesome-creative-coding)
- **awesome-manim / manim.community/awesome** — [GitHub](https://www.github.com/ManimCommunity/awesome-manim)
- **Remotion ecosystem projects** are indexed on ecosyste.ms: remotion-skia, remotion-codehike-twoslash and others — [remotion-skia](https://awesome.ecosyste.ms/projects/github.com%2Fwcandillon%2Fremotion-skia); [codehike-twoslash](https://awesome.ecosyste.ms/projects/github.com%2Fhunghg255%2Fremotion-codehike-twoslash); GitHub topic: [repos.ecosyste.ms topic remotion](https://repos.ecosyste.ms/hosts/GitHub/topics/remotion)
- Not verified this session (well-known): CodePen Spark / "Picked Pens" (https://codepen.io/spark), Awwwards WebGL collection (https://www.awwwards.com/websites/webgl/), Shadertoy (https://www.shadertoy.com), and the GSAP CodePen collection (https://codepen.io/GreenSock).

### Inferences
- For "code-made launch video" inspiration specifically, the most useful places are the Remotion showcase, the RemotionUI showcase, GitHub launch-video skill repos (Every, sub-level, IstiqlalBhat), and roundups such as OfficeChai's. Codrops, Awwwards and CodePen cover interactive web motion rather than rendered videos.

### Gaps
- I found no dedicated `awesome-remotion` or `awesome-motion-canvas` repo in search; they may exist, but I couldn't confirm them.
- I didn't fetch X/Twitter threads, which are not accessible here. Specific viral creator posts of Claude + Remotion videos aren't catalogued beyond the articles above.
