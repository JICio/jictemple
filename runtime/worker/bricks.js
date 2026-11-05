// Factual architecture primitives. Labels and formulas follow jic.io.
// Source texts retain their own licenses; an entry is not a blanket license.
export const ELEMENTS=[
 ['LOVE','金','金','Metal','關係、關懷、價值與承諾。','关系、关怀、价值与承诺。','Relationship, care, value and commitment.'],
 ['WISH','木','木','Wood','意圖、方向、成長與同意。','意图、方向、成长与同意。','Intention, direction, growth and consent.'],
 ['TIME','火','火','Fire','次序、變化、節奏與期限。','次序、变化、节奏与期限。','Sequence, change, rhythm and deadline.'],
 ['SPACE','土','土','Earth','場所、邊界、管轄與資源。','场所、边界、管辖与资源。','Place, boundary, jurisdiction and resources.'],
 ['XYZT','水','水','Water','可核對的時空、事件與來源。','可核对的时空、事件与来源。','Verifiable spacetime, events and provenance.']
].map(([id,hant,hans,en,a,b,c])=>({id:'element-'+id.toLowerCase(),symbol:id,kind:'element',formula:[id],title:{'zh-Hant':hant,'zh-Hans':hans,en},description:{'zh-Hant':a,'zh-Hans':b,en:c},tags:[id],source:'https://jic.io/#five',license:'facts-and-formulas',reusableFields:['id','symbol','kind','formula','title','tags'],sourceCategory:'architecture'}));
export const POWERS=[
 ['love','愛力','爱力','Love Power','☰',['LOVE']],['wish','願力','愿力','Wish Power','☷',['WISH']],
 ['influence','影響力','影响力','Influence Power','☳',['XYZT','LOVE']],['creation','創造力','创造力','Creative Power','☶',['XYZT','SPACE']],
 ['endurance','持久力','持久力','Endurance Power','☵',['XYZT','TIME']],['execution','執行力','执行力','Execution Power','☲',['WISH','TIME']],
 ['imagination','想象力','想象力','Imagination Power','☱',['WISH','SPACE']],['attention','注意力','注意力','Attention Power','☴',['WISH','LOVE']]
].map(([id,hant,hans,en,trigram,formula])=>({id:'power-'+id,kind:'power',title:{'zh-Hant':hant,'zh-Hans':hans,en},symbol:trigram,formula,tags:formula,source:'https://jic.io/#eight',license:'facts-and-formulas',reusableFields:['id','symbol','kind','formula','title','tags'],sourceCategory:'architecture'}));
export const SOURCE_BRICKS=[
 {id:'source-handbook',kind:'source',title:{'zh-Hant':'JIC 工作手冊','zh-Hans':'JIC 工作手册',en:'JIC Work Handbook'},source:'https://handbook.jic.io/',sourceCategory:'working-draft',license:'source-terms',embedded:false,tags:['LOVE','WISH','TIME','SPACE','XYZT']},
 {id:'source-code-of-i',kind:'source',title:{'zh-Hant':'我之代碼','zh-Hans':'我之代码',en:'The Code of I'},source:'https://codeofi.jic.io/',sourceCategory:'philosophy',license:'verify-at-source',embedded:false,tags:['LOVE','WISH']},
 {id:'source-canon-2069',kind:'source',title:{'zh-Hant':'2069 Canon','zh-Hans':'2069 Canon',en:'2069 Canon'},source:'https://canon.jic.io/',sourceCategory:'fiction',license:'CC0-1.0',embedded:false,tags:['WISH','SPACE']}
];
export const BRICKS=[...ELEMENTS,...POWERS,...SOURCE_BRICKS];
