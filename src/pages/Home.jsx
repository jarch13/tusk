// src/pages/Home.jsx
export default function Home() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Hero */}
      <section className="rounded-xl border bg-white/80 dark:bg-gray-800/70 dark:border-gray-700 backdrop-blur p-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
          Welcome to Tusk 🐘
        </h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          A lightweight, student-run hub for Cal State Fullerton. Buy/sell/trade safely with classmates,
          post anonymous confessions, and keep campus life moving.
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <b>Note:</b> All posts auto-expire after <b>30 days</b> to keep things fresh.
        </p>
      </section>

      {/* What you can do */}
      <section className="mt-6 rounded-xl border bg-white/80 dark:bg-gray-800/70 dark:border-gray-700 backdrop-blur p-6">
        <h2 className="text-xl font-semibold">What you can do</h2>
        <ul className="mt-3 space-y-2 list-disc list-inside text-gray-800 dark:text-gray-200">
          <li><b>Marketplace</b>: list books, tech, furniture, rides, sublets, and freebies.</li>
          <li><b>Confessions</b>: share thoughts anonymously; vote and discuss.</li>
          <li><b>Profiles</b>: set a display name for Marketplace; manage your listings.</li>
          <li><b>Privacy</b>: log in with your CSUF email. Confessions use rotating, anonymous tokens—no real names shown.</li>
        </ul>
      </section>

      {/* House rules */}
      <section className="mt-6 rounded-xl border bg-white/80 dark:bg-gray-800/70 dark:border-gray-700 backdrop-blur p-6">
        <h2 className="text-xl font-semibold">House rules</h2>
        <ul className="mt-3 space-y-2 list-disc list-inside text-gray-800 dark:text-gray-200">
          <li>Be respectful. No harassment, hate speech, threats, doxxing, or impersonation.</li>
          <li>No spam, scams, or multi-posting the same content.</li>
          <li>Keep it legal and campus-appropriate. Follow CSU/CSUF policies and the law.</li>
          <li>Report problems with the <span title="Report">🚩</span> button. Repeat violations may lead to restrictions.</li>
        </ul>
      </section>

      {/* Marketplace rules */}
      <section className="mt-6 rounded-xl border bg-white/80 dark:bg-gray-800/70 dark:border-gray-700 backdrop-blur p-6">
        <h2 className="text-xl font-semibold">Marketplace rules</h2>
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Allowed</h3>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-800 dark:text-gray-200">
              <li>Textbooks & study materials, dorm/apartment items, electronics</li>
              <li>Tickets at face value, rideshare/car-pool, sublets (follow housing policies)</li>
              <li>Freebies</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Not allowed</h3>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-800 dark:text-gray-200">
              <li>Weapons, explosives, drugs, alcohol, vaping products</li>
              <li>Stolen/counterfeit goods, animals/pets, medical devices</li>
              <li>Academic misconduct services (essays, exam keys)</li>
            </ul>
          </div>
        </div>
        <h3 className="mt-4 font-medium text-gray-900 dark:text-gray-100">Listing tips</h3>
        <ul className="mt-2 space-y-1 list-disc list-inside text-gray-800 dark:text-gray-200">
          <li>Clear title + accurate description + price (or mark as <i>Free</i>).</li>
          <li>Add a real photo. Mark <b>Sold</b> when done; use <b>Hide</b> to pause.</li>
          <li>Meet in public, well-lit places (library, student union). Tusk is not an escrow.</li>
        </ul>
      </section>

      {/* Confessions rules */}
      <section className="mt-6 rounded-xl border bg-white/80 dark:bg-gray-800/70 dark:border-gray-700 backdrop-blur p-6">
        <h2 className="text-xl font-semibold">Confessions rules</h2>
        <ul className="mt-3 space-y-2 list-disc list-inside text-gray-800 dark:text-gray-200">
          <li>Keep it anonymous, kind(ish), and campus-relevant.</li>
          <li>No identifying private individuals without consent.</li>
          <li>No threats, targeted harassment, discrimination, or pornographic content.</li>
          <li>Sensitive topics are okay—be constructive and mindful.</li>
          <li>Vote posts up/down; use <span title="Report">🚩</span> to report. Authors can delete their own posts/comments.</li>
        </ul>
      </section>

      {/* Safety & privacy */}
      <section className="mt-6 rounded-xl border bg-white/80 dark:bg-gray-800/70 dark:border-gray-700 backdrop-blur p-6">
        <h2 className="text-xl font-semibold">Safety & privacy</h2>
        <ul className="mt-3 space-y-2 list-disc list-inside text-gray-800 dark:text-gray-200">
          <li>We store the minimum necessary. Marketplace uses your display name; Confessions are token-based.</li>
          <li>Moderation combines community reports with lightweight automated checks.</li>
          <li>Emergencies or imminent harm: call <b>911</b> or contact <b>CSUF Police</b> immediately.</li>
        </ul>
      </section>

      {/* Quick tips & disclaimer */}
      <section className="mt-6 rounded-xl border bg-white/80 dark:bg-gray-800/70 dark:border-gray-700 backdrop-blur p-6">
        <h2 className="text-xl font-semibold">Quick tips</h2>
        <ul className="mt-3 space-y-2 list-disc list-inside text-gray-800 dark:text-gray-200">
          <li><b>Install as an app</b>: Add to Home Screen for a fast PWA experience.</li>
          <li><b>Notifications</b>: enable to get replies and DM pings (coming soon).</li>
          <li><b>Support</b>: send feedback from your <b>Profile</b> page.</li>
        </ul>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <b>Community disclaimer:</b> Tusk is a community tool created by students for students. It is not an official
          service of Cal State Fullerton. Use at your own discretion and follow all campus policies and laws.
        </p>
      </section>
    </div>
  )
}
