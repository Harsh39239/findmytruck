/* eslint-disable @next/next/no-img-element -- fixed screenshots with known sizes, nothing to optimise */
import HashRedirect from "./hash-redirect";

const GITHUB = "https://github.com/Harsh39239/findmytruck";

function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 6h13v10H1zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" fill="#1f5eff" /><circle cx="18" cy="18" r="2" fill="#1f5eff" />
      </svg>
    </span>
  );
}

function RoadLorry() {
  return (
    <div className="road" aria-hidden="true">
      <svg className="lorry-side" viewBox="0 0 90 44" width="72" height="35">
        <rect x="2" y="6" width="52" height="26" rx="3" fill="#fff" stroke="#1f5eff" strokeWidth="2.5" />
        <rect x="8" y="13" width="40" height="3" fill="#1f5eff" opacity=".3" /><rect x="8" y="20" width="40" height="3" fill="#1f5eff" opacity=".3" />
        <path d="M56 12h16l12 12v8H56z" fill="#1f5eff" /><path d="M62 15h9l7 8H62z" fill="#d6e4ff" />
        <circle className="wheel" cx="18" cy="35" r="6" fill="#111" /><circle className="wheel" cx="40" cy="35" r="6" fill="#111" /><circle className="wheel" cx="72" cy="35" r="6" fill="#111" />
        <circle cx="18" cy="35" r="2" fill="#999" /><circle cx="40" cy="35" r="2" fill="#999" /><circle cx="72" cy="35" r="2" fill="#999" />
      </svg>
    </div>
  );
}

const problems = [
  { title: "Check calls all day", text: "\"Where are you?\" \"Have you loaded?\" \"Send me the photo.\" A dispatcher repeats the same calls for every truck, and every call interrupts a driver on the road." },
  { title: "A language gap in the middle", text: "Drivers speak Hindi, Tamil, Malayalam and more. The manager relays what they understood, and details get lost in translation." },
  { title: "Paperwork chased by hand", text: "Weighment slip photos are requested one by one, then the weight is typed into a sheet and compared with the expected load." },
];

const steps = [
  { n: "1", title: "Create the trip", text: "Enter the truck, the driver's mobile number, material, expected weight and route. The driver is messaged on WhatsApp and SMS as soon as you press Create." },
  { n: "2", title: "The driver replies in their language", text: "One message offers Hindi, Tamil, Malayalam and English by number. After that: 1 Reached, 2 Loaded, 3 Left, 4 Delivered, a photo of the slip, or any message in their own words." },
  { n: "3", title: "AI reads, rules decide", text: "AI translates free text and reads the weight on the slip. Plain rules then check it against the expected weight and decide OK, review or flag." },
  { n: "4", title: "You see the exceptions", text: "Every truck on one phone screen. Trucks that need a decision, or have gone quiet, come first. Everything else you can ignore." },
];

const features = [
  { title: "Drivers just chat", text: "WhatsApp or SMS, in Hindi, Tamil, Malayalam or English, chosen by the driver. No app to install and no login. Only the manager has an account." },
  { title: "Weighment slip reader", text: "Photograph the slip and the weight is read in seconds, compared with the expected load, and shown next to the photo." },
  { title: "Road route and moving lorry", text: "See the road from pickup to drop, and a lorry that moves along it as the trip progresses." },
  { title: "All trucks, one screen", text: "A fleet list sorted by who needs you. Open any truck for its map, photos, weights and timeline." },
  { title: "Silent-driver alert", text: "Set how long is too long. A truck with no news turns red, and one tap sends a reminder in the driver's language." },
  { title: "Nothing hidden", text: "Each message shows the original words beside the translation. Doubtful items are flagged for you to handle, never quietly accepted." },
];

const trust = [
  "The original message always sits next to its translation.",
  "\"Loaded\" is only confirmed when a slip photo backs it up.",
  "The weight must be within 2% of what you expected, or it is flagged.",
  "Unclear or garbled messages go to Review. The app never guesses a status.",
  "A flagged item stays on your list until you mark it handled.",
  "The lorry on the map is an estimate from the driver's status and the road time. It is not live GPS.",
];

export default function Home() {
  return (
    <div className="site">
      <HashRedirect />

      <header className="nav">
        <div className="wrap navin">
          <a className="navbrand" href="#top"><Logo /><span>FindMyTruck</span></a>
          <nav className="navlinks" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#trust">Trust</a>
            <a href="#roadmap">Roadmap</a>
          </nav>
          <a className="cta small" href="/app">Open the app</a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="wrap herogrid">
          <div>
            <p className="eyebrow">For dispatch managers and truck drivers</p>
            <h1 className="display">Know where your material is, without a single call.</h1>
            <p className="lead">
              Drivers update their status on WhatsApp or SMS, in their own language, with a number or a photo. AI translates it and reads
              the weighment slip. Managers see every truck on one phone screen.
            </p>
            <div className="ctas">
              <a className="cta" href="/app">Try the live app</a>
              <a className="cta ghost" href={GITHUB}>View the code</a>
            </div>
            <RoadLorry />
          </div>
          <div className="phone">
            <img src="/shots/fleet.jpg" width="430" height="900" alt="The FindMyTruck fleet screen showing four trucks, one flagged and one silent" />
          </div>
        </div>
      </section>

      <section className="strip">
        <div className="wrap stripgrid">
          <div><b>2 h a day</b><span>a dispatcher&apos;s own estimate of time spent on check calls</span></div>
          <div><b>4 languages</b><span>Hindi, Tamil, Malayalam and English on the driver&apos;s screen</span></div>
          <div><b>Under 5 s</b><span>from slip photo to a checked weight, in our tests</span></div>
        </div>
      </section>

      <section className="block" id="problem">
        <div className="wrap">
          <h2 className="sec">The phone is the bottleneck</h2>
          <p className="seclead">Moving material on hired trucks means a manager who keeps asking, and a driver who keeps being asked.</p>
          <div className="cards3">
            {problems.map((p) => (
              <article className="sitecard" key={p.title}><h3>{p.title}</h3><p>{p.text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="block alt" id="how">
        <div className="wrap">
          <h2 className="sec">How it works</h2>
          <ol className="steps4">
            {steps.map((s) => (
              <li key={s.n}><span className="num">{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></li>
            ))}
          </ol>
          <div className="shots">
            <figure><img src="/shots/driver.jpg" width="430" height="600" alt="The driver's screen in Hindi with four large status buttons and a camera button" loading="lazy" /><figcaption>The driver&apos;s screen, in Hindi</figcaption></figure>
            <figure><img src="/shots/trip.jpg" width="430" height="1500" alt="A truck's dashboard with route map, moving lorry, and a timeline of checked messages" loading="lazy" /><figcaption>One truck: route, lorry and timeline</figcaption></figure>
          </div>
        </div>
      </section>

      <section className="block" id="features">
        <div className="wrap">
          <h2 className="sec">What you get</h2>
          <div className="cards3">
            {features.map((f) => (
              <article className="sitecard" key={f.title}><h3>{f.title}</h3><p>{f.text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="block alt" id="trust">
        <div className="wrap twocol">
          <div>
            <h2 className="sec">AI reads. Rules decide. You see everything.</h2>
            <p className="seclead">
              AI is good at reading messy messages and photos. It is not trusted to approve anything.
              Every decision about OK, review or flag is made by simple rules you can read.
            </p>
          </div>
          <ul className="ticks">
            {trust.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      </section>

      <section className="block" id="impact">
        <div className="wrap">
          <h2 className="sec">Time back for managers</h2>
          <div className="impact">
            <div className="sitecard"><b className="big">2.4 to 6.9 h</b><span>saved per manager each week</span></div>
            <p className="seclead" style={{ margin: 0 }}>
              The low end counts only the calls (about 11 a day at 5 minutes each). The high end counts all follow-up work,
              assuming 70% of it goes away and the dashboard takes 15 minutes a day. These are estimates from one dispatcher&apos;s experience.
              A pilot would measure the real number.
            </p>
          </div>
        </div>
      </section>

      <section className="block alt" id="roadmap">
        <div className="wrap">
          <h2 className="sec">Roadmap</h2>
          <div className="twocol">
            <div className="sitecard">
              <h3>Built in this prototype</h3>
              <ul className="plain">
                <li>A WhatsApp and SMS conversation in 4 languages, with the driver choosing theirs</li>
                <li>A driver web page with big buttons and a QR code, as a fallback</li>
                <li>Slip reading with a weight check</li>
                <li>Fleet screen, route map and moving lorry</li>
                <li>Silent-driver alert and reminders</li>
                <li>Flags, review and &quot;mark as handled&quot;</li>
              </ul>
            </div>
            <div className="sitecard">
              <h3>Next</h3>
              <ul className="plain">
                <li>An approved WhatsApp Business sender, so any driver can be messaged</li>
                <li>Voice notes in regional languages</li>
                <li>Weighbridge integration</li>
                <li>Quality checklists for each material</li>
                <li>Offline mode, and accounts for each company</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="finalcta">
        <div className="wrap">
          <h2>See it working</h2>
          <p>Create a trip, open the driver link on a phone, and watch the status arrive.</p>
          <div className="ctas center">
            <a className="cta light" href="/app">Open the app</a>
            <a className="cta outline" href={GITHUB}>GitHub</a>
          </div>
        </div>
      </section>

      <footer className="sitefoot">
        <div className="wrap">
          <span>FindMyTruck. A hackathon prototype.</span>
          <span>Lorry positions are estimates, not live GPS. Sending real WhatsApp and SMS messages needs a messaging account (Twilio) to be connected. Translations should be checked by a native speaker before real use.</span>
        </div>
      </footer>
    </div>
  );
}
