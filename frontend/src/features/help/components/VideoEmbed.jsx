export default function VideoEmbed({ url }) {
  if (!url) return null;

  return (
    <div className="relative w-full pb-[56.25%] mb-6 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
      <iframe
        src={url}
        title="Guide video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
    </div>
  );
}
