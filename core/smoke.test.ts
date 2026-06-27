import { describe, it, expect } from 'vitest'

// Phase 0 のスモークテスト: テストランナー（Vitest）が動くことの確認用。
// Phase 1 でコア計算（給与所得控除→…→手取り）の実テストに置き換えていく。
describe('smoke', () => {
  it('Vitest が実行できる', () => {
    expect(1 + 1).toBe(2)
  })
})
