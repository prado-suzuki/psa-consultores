interface FieldPairProps {
  label: string;
  value: string | undefined;
}

const FieldPair = ({ label, value }: FieldPairProps) => (
  <div className="min-w-0">
    <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
    <div className="break-words text-sm text-foreground">{value || "—"}</div>
  </div>
);

export default FieldPair;
