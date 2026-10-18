// Original vector artwork: no external image requests or stock-photo permissions.
export default function NeighbourhoodScene({ className = "" }) {
  return (
    <svg
      viewBox="0 0 560 310"
      fill="none"
      aria-hidden="true"
      className={`neighbourhood-scene ${className}`}
    >
      <circle cx="424" cy="91" r="67" className="scene-sun" />
      <path
        d="M39 246C104 209 172 219 234 245C310 277 416 275 520 229"
        className="scene-path"
        strokeWidth="34"
        strokeLinecap="round"
      />
      <path
        d="M48 246C124 227 165 239 236 261C316 286 430 275 510 245"
        className="scene-route"
        strokeWidth="2"
        strokeDasharray="4 9"
        strokeLinecap="round"
      />
      <g className="scene-building scene-building-one">
        <path
          d="M91 118L164 83L237 119V239L163 264L91 235V118Z"
          className="scene-house-a"
        />
        <path
          d="M164 83V264L237 239V119L164 83Z"
          className="scene-house-a-side"
        />
        <path
          d="M81 121L164 72L246 114L237 125L164 91L91 131L81 121Z"
          className="scene-roof"
        />
        <path
          d="M111 143L135 133V164L111 174V143ZM111 191L135 182V212L111 222V191Z"
          className="scene-window"
        />
        <path
          d="M183 132L206 143V173L183 164V132ZM183 184L206 194V224L183 215V184Z"
          className="scene-window-side"
        />
        <path d="M146 206L163 200V264L146 257V206Z" className="scene-door" />
      </g>
      <g className="scene-building scene-building-two">
        <path
          d="M252 111L322 78L388 113V234L322 260L252 234V111Z"
          className="scene-house-b"
        />
        <path
          d="M322 78V260L388 234V113L322 78Z"
          className="scene-house-b-side"
        />
        <path
          d="M243 115L322 65L397 107L388 120L322 85L252 124L243 115Z"
          className="scene-roof-b"
        />
        <path
          d="M269 137L294 125V156L269 167V137ZM269 181L294 171V201L269 211V181Z"
          className="scene-window"
        />
        <path
          d="M341 128L368 142V170L341 158V128ZM341 180L368 193V222L341 210V180Z"
          className="scene-window-side"
        />
        <path d="M307 206L322 201V260L307 254V206Z" className="scene-door" />
      </g>
      <g className="scene-building scene-building-three">
        <path
          d="M391 162L436 140L480 164V246L436 263L391 246V162Z"
          className="scene-house-c"
        />
        <path
          d="M436 140V263L480 246V164L436 140Z"
          className="scene-house-c-side"
        />
        <path
          d="M381 163L436 126L490 158L480 171L436 147L391 173L381 163Z"
          className="scene-roof"
        />
        <path d="M403 186L421 179V201L403 209V186Z" className="scene-window" />
        <path
          d="M448 181L467 191V213L448 204V181Z"
          className="scene-window-side"
        />
        <path d="M422 226L436 221V263L422 258V226Z" className="scene-door" />
      </g>
      <g className="scene-tree">
        <path
          d="M60 216V268M509 197V249"
          className="scene-trunk"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <ellipse cx="60" cy="204" rx="24" ry="36" className="scene-leaf" />
        <ellipse cx="509" cy="189" rx="19" ry="30" className="scene-leaf" />
        <path
          d="M60 209V232M509 192V211"
          className="scene-trunk"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M255 43h23M266 32v23M470 67h14M477 60v14"
        className="scene-route"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M61 87c10-12 24-12 33 0M72 87c10-12 24-12 33 0"
        className="scene-route"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
