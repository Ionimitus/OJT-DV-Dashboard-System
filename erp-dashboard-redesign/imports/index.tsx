import imgScreenMockupReplaceFill from "";

function SizeXs({ className }: { className?: string }) {
  return (
    <div className={className || "h-[228px] relative rounded-[4px] w-[342px]"} data-name="Size=xs">
      <div aria-hidden className="absolute border-4 border-[#171717] border-solid inset-[-4px] pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[#171717] inset-[0_16px] shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.18)]" data-name="Mockup shadow" />
      <div className="absolute inset-0 pointer-events-none rounded-[4px]" data-name="Screen mockup (REPLACE FILL)">
        <img alt="" className="absolute inset-0 max-w-none object-cover rounded-[4px] size-full" src={imgScreenMockupReplaceFill} />
        <div aria-hidden className="absolute border border-[#f5f5f5] border-solid inset-0 rounded-[4px]" />
      </div>
    </div>
  );
}

export default function SizeXs1() {
  return <SizeXs className="relative rounded-[4px] size-full" />;
}