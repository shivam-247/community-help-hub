/**
 * Avatars.js - Modern colorful avatar illustration system for Community Help Hub.
 * 8 distinct avatar presets using SVG geometric patterns with personality.
 */

const AVATAR_COLORS = {
  "avatar-1": { bg: "from-indigo-500 to-violet-600", accent: "#818cf8" },
  "avatar-2": { bg: "from-rose-400 to-pink-600", accent: "#fb7185" },
  "avatar-3": { bg: "from-amber-400 to-orange-500", accent: "#fbbf24" },
  "avatar-4": { bg: "from-emerald-400 to-teal-600", accent: "#34d399" },
  "avatar-5": { bg: "from-sky-400 to-blue-600", accent: "#38bdf8" },
  "avatar-6": { bg: "from-purple-500 to-indigo-700", accent: "#a78bfa" },
  "avatar-7": { bg: "from-lime-400 to-green-600", accent: "#a3e635" },
  "avatar-8": { bg: "from-fuchsia-400 to-pink-700", accent: "#e879f9" },
};

const FACE_SVGS = {
  "avatar-1": (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="16" r="8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="20" cy="32" rx="12" ry="7" fill="rgba(255,255,255,0.7)" />
      <circle cx="17" cy="15" r="1.5" fill="#4f46e5" />
      <circle cx="23" cy="15" r="1.5" fill="#4f46e5" />
      <path d="M17 19 Q20 22 23 19" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  ),
  "avatar-2": (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="16" r="8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="20" cy="32" rx="12" ry="7" fill="rgba(255,255,255,0.7)" />
      <circle cx="17" cy="15" r="1.5" fill="#be185d" />
      <circle cx="23" cy="15" r="1.5" fill="#be185d" />
      <path d="M17 18.5 Q20 21.5 23 18.5" stroke="#be185d" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M16 11 Q17.5 9.5 19 10" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M21 10 Q22.5 9.5 24 11" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  "avatar-3": (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="16" r="8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="20" cy="32" rx="12" ry="7" fill="rgba(255,255,255,0.7)" />
      <circle cx="17" cy="15" r="1.5" fill="#92400e" />
      <circle cx="23" cy="15" r="1.5" fill="#92400e" />
      <path d="M16.5 19 Q20 22.5 23.5 19" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="14" y="8" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.6)" />
    </svg>
  ),
  "avatar-4": (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="16" r="8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="20" cy="32" rx="12" ry="7" fill="rgba(255,255,255,0.7)" />
      <circle cx="17" cy="15" r="1.5" fill="#065f46" />
      <circle cx="23" cy="15" r="1.5" fill="#065f46" />
      <path d="M17 18.5 Q20 21 23 18.5" stroke="#065f46" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="17" cy="15" r="3" fill="rgba(16,185,129,0.2)" />
      <circle cx="23" cy="15" r="3" fill="rgba(16,185,129,0.2)" />
    </svg>
  ),
  "avatar-5": (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="16" r="8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="20" cy="32" rx="12" ry="7" fill="rgba(255,255,255,0.7)" />
      <circle cx="17" cy="15" r="1.5" fill="#0c4a6e" />
      <circle cx="23" cy="15" r="1.5" fill="#0c4a6e" />
      <path d="M17 19 Q20 21.5 23 19" stroke="#0c4a6e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="15" y="18.5" width="10" height="1.5" rx="0.75" fill="rgba(14,165,233,0.4)" />
    </svg>
  ),
  "avatar-6": (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="16" r="8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="20" cy="32" rx="12" ry="7" fill="rgba(255,255,255,0.7)" />
      <circle cx="17" cy="15" r="1.5" fill="#4c1d95" />
      <circle cx="23" cy="15" r="1.5" fill="#4c1d95" />
      <path d="M17 19.5 Q20 22 23 19.5" stroke="#4c1d95" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M13 13 Q16 8 20 10 Q24 8 27 13" stroke="rgba(139,92,246,0.6)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  "avatar-7": (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="16" r="8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="20" cy="32" rx="12" ry="7" fill="rgba(255,255,255,0.7)" />
      <circle cx="17" cy="15" r="1.5" fill="#166534" />
      <circle cx="23" cy="15" r="1.5" fill="#166534" />
      <path d="M17 19 Q20 21.5 23 19" stroke="#166534" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <ellipse cx="20" cy="15" rx="6" ry="2" fill="rgba(163,230,53,0.3)" />
    </svg>
  ),
  "avatar-8": (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="16" r="8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="20" cy="32" rx="12" ry="7" fill="rgba(255,255,255,0.7)" />
      <circle cx="17" cy="15" r="1.5" fill="#701a75" />
      <circle cx="23" cy="15" r="1.5" fill="#701a75" />
      <path d="M17 19 Q20 22 23 19" stroke="#701a75" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="12" r="2" fill="rgba(232,121,249,0.5)" />
    </svg>
  ),
};

export const AVATAR_LABELS = {
  "avatar-1": "Indigo",
  "avatar-2": "Rose",
  "avatar-3": "Amber",
  "avatar-4": "Emerald",
  "avatar-5": "Sky",
  "avatar-6": "Purple",
  "avatar-7": "Lime",
  "avatar-8": "Fuchsia",
};

/**
 * Avatar component.
 * @param {string} id - avatar id like "avatar-1"
 * @param {string} name - user name (fallback to initial letter)
 * @param {string} size - tailwind size class, e.g. "w-10 h-10"
 * @param {string} className - extra classes
 */
export default function Avatar({ id = "avatar-1", name = "", size = "w-10 h-10", className = "" }) {
  const colorConfig = AVATAR_COLORS[id] || AVATAR_COLORS["avatar-1"];
  const svgFace = FACE_SVGS[id] || FACE_SVGS["avatar-1"];

  return (
    <div
      className={`${size} rounded-xl bg-gradient-to-tr ${colorConfig.bg} flex items-center justify-center shadow-sm shrink-0 overflow-hidden ${className}`}
    >
      <div className="w-full h-full">
        {svgFace}
      </div>
    </div>
  );
}

/** Small compact avatar for use in cards/pills */
export function AvatarSmall({ id = "avatar-1", name = "", size = "w-7 h-7", className = "" }) {
  return <Avatar id={id} name={name} size={size} className={`rounded-xl ${className}`} />;
}

