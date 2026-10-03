/** 自己ベスト。サインインしていないか、まだ記録がなければ何も出さない */
export default function BestScore({ best }: { best: number | null | undefined }) {
  return best == null ? null : <p>自己ベスト: {best}点</p>;
}
