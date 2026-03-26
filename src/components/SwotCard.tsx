"use client";

interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

const sections = [
  { key: "strengths" as const, title: "S - 강점 (Strengths)", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: "+" },
  { key: "weaknesses" as const, title: "W - 약점 (Weaknesses)", bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: "-" },
  { key: "opportunities" as const, title: "O - 기회 (Opportunities)", bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: "^" },
  { key: "threats" as const, title: "T - 위협 (Threats)", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", icon: "!" },
];

export function SwotCard({ swot }: { swot: SwotData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map(({ key, title, bg, border, text, icon }) => (
        <div key={key} className={`${bg} ${border} border rounded-xl p-5`}>
          <h3 className={`font-bold ${text} mb-3 text-lg`}>{title}</h3>
          <ul className="space-y-2">
            {swot[key].map((item, i) => (
              <li key={i} className={`${text} text-sm flex items-start gap-2`}>
                <span className="font-bold mt-0.5 shrink-0">{icon}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
