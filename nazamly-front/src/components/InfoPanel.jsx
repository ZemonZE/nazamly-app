import tryImage from "../assets/Eco-System.jpg";

function InfoPanel() {
  return (
    <div className="hidden md:flex flex-col justify-center rounded-2xl bg-gradient-to-br from-brand-teal/10 via-brand-mint to-brand-orange/10 p-8">
      <div className="overflow-hidden rounded-xl shadow-lg mb-6">
        <img src={tryImage} alt="نظملي" className="w-full h-48 object-cover" />
      </div>
      <h3 className="font-display text-xl font-bold mb-2">Integrated Education System</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Nazamly is an integrated learning management system providing a comprehensive educational environment
      </p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-white text-xs">✓</span>
          Manage lessons and exams
        </li>
        <li className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-white text-xs">✓</span>
          Effective communication between students and teachers
        </li>
        <li className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-white text-xs">✓</span>
          Comprehensive educational environment
        </li>
      </ul>
    </div>
  );
}

export default InfoPanel;
