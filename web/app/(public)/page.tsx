export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <p className="text-mute text-xs tracking-widest mb-3 font-mono">
          MANTLE × AI × RWA · TURING TEST HACKATHON 2026
        </p>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight font-display">
          매일 한 번,<br />
          <span className="text-neon">AI가 그 날의<br />핫 자산을 토큰화한다.</span>
        </h1>
        <p className="mt-6 text-mute">
          Wireframe in progress · {new Date().toISOString().slice(0, 10)}
        </p>
      </div>
    </main>
  );
}
