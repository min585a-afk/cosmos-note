/**
 * AI-like suggestion engine for analysis tree branching.
 * Generates 5 alternatives per step.
 * (추후 GPT/Gemini API 연동 예정)
 */

interface Suggestion {
  label: string
  description: string
}

const ANALYSIS_PATTERNS: Record<string, Suggestion[]> = {
  '디자인': [
    { label: 'UI/UX 리서치', description: '사용자 조사와 경쟁사 분석을 통한 디자인 방향 설정' },
    { label: '와이어프레임 제작', description: '핵심 화면의 레이아웃과 흐름 설계' },
    { label: '디자인 시스템 구축', description: '색상, 타이포, 컴포넌트 등 기본 시스템 정의' },
    { label: '프로토타입 제작', description: 'Figma/Framer로 인터랙티브 프로토타입 구현' },
    { label: '사용성 테스트 설계', description: '타겟 사용자 대상 테스트 시나리오 준비' },
  ],
  '개발': [
    { label: '기술 스택 선정', description: '프로젝트에 적합한 언어, 프레임워크 결정' },
    { label: '아키텍처 설계', description: '시스템 구조와 데이터 흐름 설계' },
    { label: '프로토타입 개발', description: '핵심 기능의 빠른 프로토타입 구현' },
    { label: 'CI/CD 파이프라인', description: '자동 빌드, 테스트, 배포 환경 구축' },
    { label: 'DB 스키마 설계', description: '데이터 모델링 및 관계 정의' },
  ],
  '기획': [
    { label: '시장 조사', description: '대상 시장과 경쟁 제품 분석' },
    { label: '사용자 페르소나', description: '핵심 타겟 사용자 정의' },
    { label: '기능 명세서', description: '필수 기능과 우선순위 정리' },
    { label: '비즈니스 모델', description: '수익 구조와 성장 전략 설계' },
    { label: '로드맵 작성', description: '분기별 마일스톤과 목표 설정' },
  ],
  '마케팅': [
    { label: 'SNS 마케팅', description: '소셜 미디어 채널 전략 수립' },
    { label: '콘텐츠 마케팅', description: '블로그, 영상 등 콘텐츠 기획' },
    { label: '광고 캠페인', description: '유료 광고 플랫폼 선정 및 예산 계획' },
    { label: 'SEO 최적화', description: '검색 엔진 최적화 전략' },
    { label: '인플루언서 협업', description: '업계 인플루언서와의 파트너십 구축' },
  ],
  '출시': [
    { label: '베타 테스트', description: '제한된 사용자에게 먼저 공개하여 피드백 수집' },
    { label: '런칭 이벤트', description: '출시 기념 이벤트 및 프로모션 기획' },
    { label: '보도자료 배포', description: '미디어 대상 PR 활동' },
    { label: '앱스토어 최적화', description: 'ASO 전략으로 검색 노출 극대화' },
    { label: '고객 지원 체계', description: 'FAQ, 챗봇, CS 팀 구성' },
  ],
  '학습': [
    { label: '기초 이론 학습', description: '핵심 개념과 원리 파악' },
    { label: '실습 프로젝트', description: '작은 프로젝트로 직접 경험하기' },
    { label: '온라인 강의', description: '체계적인 커리큘럼으로 학습' },
    { label: '커뮤니티 참여', description: '관련 커뮤니티에서 질문/토론' },
    { label: '멘토링 찾기', description: '경험자에게 조언 구하기' },
  ],
}

const DEPTH_SUGGESTIONS: Record<number, (label: string) => Suggestion[]> = {
  0: (label) => [
    { label: `${label}의 목표 정의`, description: '구체적인 목표와 성공 기준 설정' },
    { label: `${label} 리서치`, description: '관련 자료 조사 및 레퍼런스 수집' },
    { label: `${label} 범위 설정`, description: '프로젝트 범위와 제약 조건 정리' },
    { label: `현재 상황 분석`, description: '현재 보유 리소스와 능력 파악' },
    { label: `벤치마킹`, description: '유사 사례 분석 및 핵심 인사이트 도출' },
  ],
  1: (_label) => [
    { label: '세부 계획 수립', description: '단계별 실행 계획과 일정 수립' },
    { label: '리소스 확인', description: '필요한 인력, 도구, 예산 파악' },
    { label: '우선순위 결정', description: '핵심 항목과 부가 항목 분류' },
    { label: '위험 요소 분석', description: '잠재적 장애물과 대응 방안 마련' },
    { label: '협업 체계 구축', description: '팀원 역할 분담 및 소통 채널 설정' },
  ],
  2: (_label) => [
    { label: '실행 단계', description: '계획에 따른 실제 작업 시작' },
    { label: '팀 배분', description: '역할과 책임 할당' },
    { label: '마일스톤 설정', description: '중간 점검 포인트 설정' },
    { label: '일일 스탠드업', description: '매일 진행 상황 공유 체계' },
    { label: '도구 세팅', description: '작업 도구 및 환경 설정' },
  ],
  3: (_label) => [
    { label: '중간 점검', description: '진행 상황 확인 및 방향 조정' },
    { label: '피드백 수집', description: '이해관계자 피드백 수렴' },
    { label: '문제 해결', description: '발생한 이슈 분석 및 해결' },
    { label: '품질 리뷰', description: '결과물 품질 검토 및 개선' },
    { label: '일정 재조정', description: '실제 진행도에 맞춘 일정 업데이트' },
  ],
  4: (_label) => [
    { label: '테스트 & QA', description: '품질 검증 및 테스트' },
    { label: '최적화', description: '성능 개선 및 최적화' },
    { label: '문서화', description: '결과물 정리 및 문서 작성' },
    { label: '최종 리뷰', description: '전체 결과물 종합 검토' },
    { label: '회고 & 정리', description: '프로젝트 회고 및 학습 정리' },
  ],
}

export function generateSuggestions(
  nodeLabel: string,
  nodeDescription: string,
  depth: number,
  _siblingLabels: string[] = []
): Suggestion[] {
  const lowerLabel = nodeLabel.toLowerCase()
  const lowerDesc = (nodeDescription || '').toLowerCase()
  const combined = `${lowerLabel} ${lowerDesc}`

  // 1. Korean keyword patterns
  for (const [keyword, suggestions] of Object.entries(ANALYSIS_PATTERNS)) {
    if (combined.includes(keyword)) {
      return suggestions
    }
  }

  // 2. English keyword patterns
  if (combined.includes('design') || combined.includes('ui') || combined.includes('ux')) {
    return [
      { label: 'User Research', description: 'Conduct user interviews and competitive analysis' },
      { label: 'Wireframing', description: 'Create low-fidelity wireframes for key screens' },
      { label: 'Design System', description: 'Define colors, typography, and component library' },
      { label: 'Prototyping', description: 'Build interactive prototypes for key flows' },
      { label: 'Usability Testing', description: 'Plan and conduct usability tests with target users' },
    ]
  }

  if (combined.includes('develop') || combined.includes('code') || combined.includes('build')) {
    return [
      { label: 'Tech Stack Decision', description: 'Choose languages, frameworks, and tools' },
      { label: 'Architecture Design', description: 'Plan system structure and data flow' },
      { label: 'MVP Development', description: 'Build minimum viable product first' },
      { label: 'Testing Strategy', description: 'Define unit, integration, and E2E test approach' },
      { label: 'DevOps Setup', description: 'Configure CI/CD and deployment pipeline' },
    ]
  }

  if (combined.includes('plan') || combined.includes('project')) {
    return [
      { label: 'Requirements Gathering', description: 'Define functional and non-functional requirements' },
      { label: 'Timeline Planning', description: 'Create project timeline and milestones' },
      { label: 'Risk Assessment', description: 'Identify potential risks and mitigation strategies' },
      { label: 'Stakeholder Alignment', description: 'Align expectations with all stakeholders' },
      { label: 'Budget Planning', description: 'Estimate costs and allocate budget' },
    ]
  }

  // 3. Depth-based
  const depthFn = DEPTH_SUGGESTIONS[Math.min(depth, 4)]
  if (depthFn) return depthFn(nodeLabel)

  // 4. Fallback
  return [
    { label: '다음 단계 진행', description: `${nodeLabel} 이후의 실행 계획` },
    { label: '대안 검토', description: '다른 접근 방식 탐색' },
    { label: '전문가 자문', description: '해당 분야 전문가의 의견 수렴' },
    { label: '파일럿 테스트', description: '소규모로 먼저 시도해보기' },
    { label: '완료 및 정리', description: '현재 단계 마무리 및 결과 정리' },
  ]
}

/**
 * Generate a summary of the completed analysis path for Graph View export
 */
export function generatePathSummary(
  nodes: Array<{ label: string; description: string; status: string; depth: number }>
): string {
  const activePath = nodes
    .filter(n => n.status === 'completed' || n.status === 'active')
    .sort((a, b) => a.depth - b.depth)

  if (activePath.length === 0) return ''

  const steps = activePath.map((n, i) => `${i + 1}. ${n.label}`).join('\n')
  return `## 분석 경로\n${steps}\n\n## 방향\n${activePath[activePath.length - 1].label}을(를) 통해 목표를 달성합니다.`
}
