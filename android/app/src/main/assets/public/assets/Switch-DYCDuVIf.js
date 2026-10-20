import{j as s}from"./vendor-react-B1cro10G.js";const r={sm:{track:"w-10 h-6",knob:"w-5 h-5",on:"translate-x-4"},md:{track:"w-12 h-7",knob:"w-6 h-6",on:"translate-x-5"}};function c({checked:t,onChange:a,disabled:n,size:o="md",className:l="",...e}){const i=r[o];return s.jsx("button",{type:"button",role:"switch","aria-checked":t,"aria-label":e["aria-label"],"aria-labelledby":e["aria-labelledby"],disabled:n,onClick:()=>a(!t),className:`
        relative inline-flex shrink-0 items-center rounded-full ${i.track}
        transition-colors duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]
        select-none touch-manipulation [-webkit-tap-highlight-color:transparent]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950
        disabled:opacity-50 disabled:cursor-not-allowed
        ${t?"bg-gold":"bg-mystic-700"}
        ${l}
      `,children:s.jsx("span",{"aria-hidden":!0,className:`
          absolute left-0.5 top-0.5 rounded-full ${i.knob}
          transition-transform duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]
          ${t?`${i.on} bg-mystic-950`:"translate-x-0 bg-mystic-200"}
        `})})}export{c as S};
