import { Link, Route, Routes } from "react-router-dom";
import SessionControl from "./components/SessionControl";
import GamePage from "./pages/GamePage";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[40rem] items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-bold text-highlight no-underline">
            browser-game-template
          </Link>
          <SessionControl />
        </div>
      </header>
      <main className="mx-auto max-w-[40rem] px-4 pt-3">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/games/:id" element={<GamePage />} />
        </Routes>
      </main>
    </>
  );
}
