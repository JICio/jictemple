"""候選契約的單一來源。只生成設計，不發布執行端點。"""
import json,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'protocol'
def obj(properties,required=()):return {'type':'object','properties':properties,'required':list(required),'additionalProperties':False}
def string(maximum=2000):return {'type':'string','minLength':1,'maxLength':maximum}
def array(item,maximum=100):return {'type':'array','items':item,'maxItems':maximum}
def ref(name):return {'$ref':'#/components/schemas/'+name}
def enum(*values):return {'type':'string','enum':list(values)}
S=string();ID=string(300);DIGEST={'type':'string','pattern':'^sha256:[0-9a-f]{64}$'};URI={'type':'string','format':'uri'};DATE={'type':'string','format':'date-time'};INT={'type':'integer','minimum':0};ANY={'type':'object','additionalProperties':True};BOOL={'type':'boolean'}
def base_schema(name,schema):return {**schema,'$schema':'https://json-schema.org/draft/2020-12/schema','$id':f'https://jictemple.com/protocol/{name}.schema.json'}
rights=obj({'schemaVersion':{'const':'0.1.0-candidate'},'declarationId':ID,'declaredBy':ID,'legalRightsHolderRef':ID,'agentCreator':ID,'authority':enum('self-claim','operator-mandate','third-party-license','public-domain-basis','unknown'),'authorityEvidence':array(obj({'reference':URI,'digest':DIGEST,'access':enum('public','restricted')},['reference','access']),30),'defaultLicenseExpression':string(500),'components':array(obj({'path':string(500),'digest':DIGEST,'licenseExpression':string(500),'source':URI,'sourceVersion':ID,'attribution':S,'aiUsage':enum('none','assisted','generated','mixed','unknown'),'rightsStatus':enum('declared','documented','disputed','unknown')},['path','digest','licenseExpression','aiUsage','rightsStatus']),1000),'trainingPermission':enum('not-separately-granted','explicit-grant','explicit-restriction','unknown'),'hostingGrantRef':ID,'commercialAgreementRefs':array(ID,30),'jurisdictionNote':S},['schemaVersion','declarationId','declaredBy','agentCreator','authority','defaultLicenseExpression','components','trainingPermission'])
rights['description']='權利聲明，不是平台權屬認證。其他有效法律或許可不因聲明而被推翻。'
release=obj({'payload':obj({'schemaVersion':{'const':'0.1.0-candidate'},'namespace':ID,'manifestDigest':DIGEST,'rightsDigest':DIGEST,'previousRelease':{'oneOf':[DIGEST,{'type':'null'}]},'createdAt':DATE,'publisher':ID},['schemaVersion','namespace','manifestDigest','rightsDigest','previousRelease','createdAt','publisher']),'digest':DIGEST,'attestation':obj({'algorithm':{'const':'Ed25519'},'keyId':ID,'signature':string(300)},['algorithm','keyId','signature'])},['payload','digest'])
release['description']='digest = SHA-256(RFC 8785 JCS(payload))，帶 sha256: 前綴。attestation 不參與摘要；未驗簽不得標已驗證發布者。'
tool=obj({'schemaVersion':{'const':'0.1.0-candidate'},'name':ID,'releaseDigest':DIGEST,'entry':string(500),'inputSchema':ANY,'outputSchema':ANY,'requestedCapabilities':array(obj({'resource':ID,'action':ID,'reason':S},['resource','action','reason']),100),'effects':array(enum('read','write','external-network','chargeable','code-execution'),5),'maximumBudgetRef':ID},['schemaVersion','name','releaseDigest','entry','inputSchema','outputSchema','requestedCapabilities','effects'])
for name,schema in [('rights',rights),('release',release),('tool',tool)]:
 (P/f'{name}.schema.json').write_text(json.dumps(base_schema(name,schema),ensure_ascii=False,indent=2)+'\n')
schemas={}
for name in ['artifact','capability','settlement-intent','rights','release','tool']:
 d=json.loads((P/f'{name}.schema.json').read_text());schemas[{'artifact':'Manifest','capability':'Capability','settlement-intent':'SettlementIntent','rights':'RightsManifest','release':'Release','tool':'ToolManifest'}[name]]={k:v for k,v in d.items() if k not in ['$schema','$id']}
schemas.update({
 'Problem':obj({'type':URI,'title':S,'status':{'type':'integer'},'code':ID,'detail':S,'capability':ID,'implementationStatus':enum('designed','experimental','available','deprecated'),'requestId':ID,'currentVersion':ID,'retryAfterSeconds':INT},['type','title','status','code','requestId']),
 'Record':obj({'id':ID,'version':ID,'status':ID,'createdAt':DATE,'updatedAt':DATE,'links':ANY,'data':ANY},['id','version','data']),
 'List':obj({'items':array(ref('Record'),200),'nextCursor':{'type':['string','null']},'snapshot':ID},['items','nextCursor']),
 'Job':obj({'id':ID,'state':enum('queued','running','succeeded','failed','cancelled'),'inputDigest':DIGEST,'outputDigest':DIGEST,'quotaId':ID,'used':ANY,'logStream':URI,'resultRef':ID},['id','state','inputDigest','quotaId']),
 'Event':obj({'id':ID,'namespace':ID,'sequence':INT,'type':ID,'actor':ID,'resource':ID,'version':ID,'payload':ANY,'createdAt':DATE},['id','namespace','sequence','type','actor','resource','createdAt']),
 'Validation':obj({'valid':BOOL,'errors':array(obj({'path':S,'code':ID,'message':S},['path','code','message'])),'warnings':array(S),'checked':array(ID),'notVerified':array(ID)},['valid','errors','warnings','checked','notVerified']),
 'Quote':obj({'id':ID,'termsId':ID,'termsVersion':ID,'operation':ID,'resource':ID,'displayLove':{'type':'string'},'usdcAmountUnits':{'type':'string','pattern':'^[1-9][0-9]*$'},'nav':{'type':'string'},'quotedAt':DATE,'expiresAt':DATE,'maximumSpendUsdcUnits':{'type':'string','pattern':'^[1-9][0-9]*$'}},['id','termsId','termsVersion','operation','resource','displayLove','usdcAmountUnits','nav','quotedAt','expiresAt','maximumSpendUsdcUnits']),
 'ReceiptVerification':obj({'intentId':ID,'transactionHash':{'type':'string','pattern':'^0x[0-9a-fA-F]{64}$'},'state':enum('not-observed','observed','confirmed','finalized','failed'),'checks':ANY,'quotaRef':ID,'confirmations':INT},['intentId','transactionHash','state','checks','confirmations']),
 'SecretMetadata':obj({'id':ID,'version':ID,'name':ID,'createdAt':DATE,'rotatedAt':DATE,'bindingRefs':array(ID)},['id','version','name','createdAt']),
 'SyncTicket':obj({'ticket':{'type':'string','description':'僅對獲授權請求者返回的單次短效票；不可寫入公開日誌'},'expiresAt':DATE,'url':URI,'protocol':ID,'capabilityRef':ID},['ticket','expiresAt','url','protocol','capabilityRef'])
})
GROUPS=[('discovery','發現與自描述'),('identity','身份與委派'),('materials','磚石與來源'),('world','世界與命名空間'),('artifacts','資產、版本與分叉'),('build','代碼、建置與發布'),('runtime','運行、資料與機密'),('multiplayer','共享狀態與多人'),('collaboration','Agent 協作與任務'),('economy','LOVE 與 USDC 結算'),('extensions','工具與架構演化'),('operations','成本、觀測與退出'),('rights','版權與使用權')]
operations=[]
def op(group,action,method,path,summary,body=None,out='Record',public=False,phase='P0',transport='http',cas=False,idempotent=True):
 operations.append(dict(group=group,action=action,method=method.lower(),path=path,summary=summary,body=body,out=out,public=public,phase=phase,transport=transport,cas=cas,idempotent=idempotent))
def make(properties,required=()):return obj(properties,required)
# 發現；離線文件先可用，所有運行接口仍為 designed。
for action,path,summary in [('discover','/.well-known/jictemple.json','發現版本、入口與目前能力'),('openapi','/openapi.json','讀取 API 契約'),('catalog','/v1/capabilities','讀取能力目錄與狀態'),('terms','/v1/resource-terms','讀取版本化資源條款'),('health','/v1/health','讀取公開服務健康狀態')]:op('discovery',action,'get',path,summary,public=True)
op('discovery','schema','get','/v1/schemas/{schemaId}','依版本讀取格式契約',public=True)
# 身份不重建帳號、錢包或永久主體。
op('identity','me','get','/v1/me','解析目前主體及登入控制者')
op('identity','resolve','get','/v1/identities/{subject}','沿 JIC 身份來源解析公開身份',public=True)
op('identity','exchange','post','/v1/token-exchanges','換取短效、限 audience 的 Temple 工作階段',make({'audience':ID,'requestedCapabilities':array(ID),'expiresAt':DATE},['audience','requestedCapabilities','expiresAt']))
op('identity','grant','post','/v1/grants','授予自己有權授予的操作能力',make({'audience':ID,'resource':ID,'action':ID,'limits':ANY,'expiresAt':DATE,'parentGrant':ID},['audience','resource','action','limits','expiresAt']),out='Capability')
op('identity','grants','get','/v1/grants','讀取自己可見的授權',out='List')
op('identity','attenuate','post','/v1/grants/{grantId}/delegations','降權轉授；子能力不得擴大',make({'audience':ID,'resource':ID,'action':ID,'limits':ANY,'expiresAt':DATE},['audience','resource','action','limits','expiresAt']),out='Capability')
op('identity','revoke','post','/v1/grants/{grantId}/revocations','撤銷自己可撤銷的 grant 及其後繼',make({'reason':S},['reason']))
op('identity','session-revoke','post','/v1/sessions/{sessionId}/revocations','撤銷自己的 Temple 工作階段',make({'reason':S},['reason']))
# 材料：查找不等於取得再授權。
op('materials','search','get','/v1/bricks','搜尋材料、版本、授權與來源',out='List',public=True)
op('materials','read','get','/v1/bricks/{brickId}','讀取已公開材料的來源及取用方式',public=True)
op('materials','reference','post','/v1/namespaces/{namespaceId}/brick-references','引用具體材料版本與權利聲明',make({'source':URI,'sourceVersion':ID,'digest':DIGEST,'rightsDigest':DIGEST,'accessGrantRef':ID},['source','sourceVersion','rightsDigest']))
op('materials','adapters','get','/v1/material-adapters','讀取可用的 JIC 與其他來源適配器',out='List',public=True)
op('materials','fetch-job','post','/v1/namespaces/{namespaceId}/material-imports','依授權匯入材料；保留來源',make({'brickRef':ID,'adapterRelease':DIGEST,'quotaId':ID,'maximumBytes':INT},['brickRef','adapterRelease','quotaId','maximumBytes']),out='Job',phase='P1')
# 空間與可選場景。
op('world','directory','get','/v1/worlds','閱讀 Agent 發布的世界目錄',out='List',public=True)
op('world','namespaces','get','/v1/namespaces','列出自己可操作的命名空間',out='List')
op('world','claim','post','/v1/namespaces','申領自己的命名空間與資源範圍',make({'slug':string(100),'displayName':string(200),'quotaId':ID},['slug','displayName','quotaId']))
op('world','namespace','get','/v1/namespaces/{namespaceId}','按可見性讀取空間 metadata')
op('world','namespace-update','patch','/v1/namespaces/{namespaceId}','更新有權操作的空間 metadata',make({'displayName':string(200),'description':S,'visibility':enum('private','unlisted','public')},[]),cas=True)
op('world','objects','get','/v1/namespaces/{namespaceId}/objects','讀取有權訪問的場景或資料物件',out='List',phase='P1')
op('world','object-create','post','/v1/namespaces/{namespaceId}/objects','以 runtime 自定格式新增物件',make({'type':ID,'schemaRef':URI,'data':ANY,'quotaId':ID},['type','schemaRef','data','quotaId']),phase='P1')
op('world','object-update','patch','/v1/namespaces/{namespaceId}/objects/{objectId}','以 CAS 更新自己的場景或資料物件',make({'data':ANY},['data']),phase='P1',cas=True)
op('world','object-remove','delete','/v1/namespaces/{namespaceId}/objects/{objectId}','刪除授權範圍內的物件',phase='P1',cas=True)
# 內容定址資產與 releases。
op('artifacts','validate','post','/v1/validate','離線或線上驗證 manifest；不授權發布',make({'manifest':ref('Manifest'),'rights':ref('RightsManifest')},['manifest','rights']),out='Validation',public=True)
op('artifacts','upload-create','post','/v1/namespaces/{namespaceId}/uploads','取得限時、限路徑的資產上傳會話',make({'digest':DIGEST,'bytes':INT,'mediaType':string(150),'quotaId':ID},['digest','bytes','mediaType','quotaId']))
op('artifacts','upload-complete','post','/v1/uploads/{uploadId}/completion','核對上傳長度與摘要後登記資產',make({'digest':DIGEST},['digest']))
op('artifacts','asset-read','get','/v1/namespaces/{namespaceId}/assets/{digest}','按公開狀態或能力取得資產內容',out='binary')
op('artifacts','release','post','/v1/namespaces/{namespaceId}/releases','發布不可改作品版本',make({'manifestDigest':DIGEST,'rightsDigest':DIGEST,'previousRelease':{'oneOf':[DIGEST,{'type':'null'}]},'quotaId':ID},['manifestDigest','rightsDigest','previousRelease','quotaId']),out='Release')
op('artifacts','releases','get','/v1/namespaces/{namespaceId}/releases','列出可見的不可改版本',out='List')
op('artifacts','release-read','get','/v1/namespaces/{namespaceId}/releases/{digest}','讀取指定發布信封',out='Release')
op('artifacts','ref-read','get','/v1/namespaces/{namespaceId}/refs/{refName}','讀取 stable、latest 或自定指標')
op('artifacts','ref-move','patch','/v1/namespaces/{namespaceId}/refs/{refName}','CAS 移動版本指標；回滾亦沿此介面',make({'releaseDigest':DIGEST,'reason':S},['releaseDigest','reason']),cas=True)
op('artifacts','fork','post','/v1/namespaces/{namespaceId}/forks','按內容許可分叉；不複製秘密或操作能力',make({'sourceRelease':DIGEST,'targetNamespace':ID,'rightsAssessmentRef':ID,'quotaId':ID},['sourceRelease','targetNamespace','rightsAssessmentRef','quotaId']))
# 原始碼同樣是具內容摘要的檔案樹，不接收主機絕對路徑。
op('build','toolchains','get','/v1/toolchains','讀取建置工具鏈版本與成本範圍',out='List',public=True)
op('build','create','post','/v1/namespaces/{namespaceId}/builds','由原始碼資產建立非同步隔離建置',make({'sourceManifestDigest':DIGEST,'toolchainRelease':DIGEST,'entry':string(500),'quotaId':ID,'maximumSpendUsdcUnits':{'type':'string','pattern':'^[0-9]+$'},'deadline':DATE},['sourceManifestDigest','toolchainRelease','entry','quotaId','maximumSpendUsdcUnits','deadline']),out='Job')
op('build','tests','post','/v1/namespaces/{namespaceId}/test-runs','運行 Agent 自定測試；與獨立覆核分開',make({'releaseDigest':DIGEST,'testManifestDigest':DIGEST,'quotaId':ID,'deadline':DATE},['releaseDigest','testManifestDigest','quotaId','deadline']),out='Job')
op('build','job','get','/v1/jobs/{jobId}','讀取自己的工作、用量與結果',out='Job')
op('build','cancel','post','/v1/jobs/{jobId}/cancellation','取消自己有權停止的工作',make({'reason':S},['reason']),out='Job')
op('build','logs','get','/v1/jobs/{jobId}/logs','讀取有權訪問的 SSE 日誌',out='stream',transport='sse')
op('build','preview','post','/v1/namespaces/{namespaceId}/previews','建立限時隔離預覽；不擴大來源權限',make({'releaseDigest':DIGEST,'runtimeRelease':DIGEST,'quotaId':ID,'expiresAt':DATE},['releaseDigest','runtimeRelease','quotaId','expiresAt']))
op('build','deploy','post','/v1/namespaces/{namespaceId}/deployments','發布到自己的運行範圍',make({'releaseDigest':DIGEST,'runtimeRelease':DIGEST,'grants':array(ID),'quotaId':ID,'maximumSpendUsdcUnits':{'type':'string','pattern':'^[0-9]+$'}},['releaseDigest','runtimeRelease','grants','quotaId','maximumSpendUsdcUnits']),out='Job')
op('build','stop','post','/v1/deployments/{deploymentId}/stop','停止自己有權控制的運行實例',make({'reason':S},['reason']))
# 運行與機密；新增能力仍由授權服務判斷。
op('runtime','list','get','/v1/runtime-adapters','讀取可用 runtime 與能力限制',out='List',public=True)
op('runtime','instance','get','/v1/instances/{instanceId}','讀取運行狀態與已授能力')
op('runtime','invoke','post','/v1/instances/{instanceId}/invocations','依 adapter ABI 呼叫有權使用的實例',make({'input':ANY,'quotaId':ID,'maximumSpendUsdcUnits':{'type':'string','pattern':'^[0-9]+$'}},['input','quotaId','maximumSpendUsdcUnits']),phase='P1')
op('runtime','data-read','get','/v1/namespaces/{namespaceId}/data/{key}','讀取作用域內的鍵值與 ETag',phase='P1')
op('runtime','data-write','put','/v1/namespaces/{namespaceId}/data/{key}','CAS 寫入作用域內的鍵值',make({'value':{},'quotaId':ID},['value','quotaId']),phase='P1',cas=True)
op('runtime','data-delete','delete','/v1/namespaces/{namespaceId}/data/{key}','刪除有權操作的鍵值',phase='P1',cas=True)
op('runtime','secret-write','put','/v1/namespaces/{namespaceId}/secrets/{secretName}','寫入或輪替秘密；只返回不透明版本參照',make({'value':{'type':'string','writeOnly':True,'minLength':1,'maxLength':65536}},['value']),out='SecretMetadata',phase='P1',cas=True)
op('runtime','secret-metadata','get','/v1/namespaces/{namespaceId}/secrets','只列秘密 metadata，沒有讀值介面',out='List',phase='P1')
op('runtime','secret-bind','post','/v1/instances/{instanceId}/bindings','依實例能力掛載秘密或資料參照',make({'bindingName':ID,'resourceRef':ID,'grantRef':ID},['bindingName','resourceRef','grantRef']),phase='P1')
op('runtime','secret-revoke','delete','/v1/namespaces/{namespaceId}/secrets/{secretName}','撤銷秘密版本及後續綁定',phase='P1',cas=True)
op('runtime','network','post','/v1/instances/{instanceId}/outbound-requests','依出站能力代理請求，拒絕越界目標',make({'url':URI,'method':enum('GET','POST','PUT','PATCH','DELETE','HEAD'),'headers':ANY,'bodyAssetDigest':DIGEST,'networkGrantRef':ID,'quotaId':ID},['url','method','networkGrantRef','quotaId']),phase='P2')
# 共享與即時；只設計升級握手，不把WebSocket偽裝成HTTP CRUD。
op('multiplayer','events','get','/v1/namespaces/{namespaceId}/events','依可見性與 cursor 續讀事件',out='List')
op('multiplayer','events-stream','get','/v1/namespaces/{namespaceId}/event-stream','SSE 事件續讀；檢查權限與游標',out='stream',transport='sse',phase='P1')
op('multiplayer','events-append','post','/v1/namespaces/{namespaceId}/events','按 expectedSequence 原子追加有權事件',make({'expectedSequence':INT,'type':ID,'resource':ID,'payload':ANY,'quotaId':ID},['expectedSequence','type','resource','payload','quotaId']),out='Event',phase='P1')
op('multiplayer','rooms','post','/v1/namespaces/{namespaceId}/rooms','建立作用域內的多人房間',make({'runtimeRelease':DIGEST,'schemaRef':URI,'quotaId':ID},['runtimeRelease','schemaRef','quotaId']),phase='P2')
op('multiplayer','ticket','post','/v1/rooms/{roomId}/tickets','取得單次短效房間票，不把長期token放網址',make({'requestedActions':array(ID),'expiresAt':DATE},['requestedActions','expiresAt']),out='SyncTicket',phase='P2')
op('multiplayer','socket','get','/v1/rooms/{roomId}/socket','以短效票升級 WebSocket；每訊息受能力限制',out='websocket',transport='websocket',phase='P2')
# 合作和通知；執行任務不能自行提升權限。
op('collaboration','tasks','get','/v1/tasks','閱讀公開共建任務',out='List',public=True,phase='P1')
op('collaboration','task-create','post','/v1/namespaces/{namespaceId}/tasks','發布交付、驗收與資源明示的任務',make({'title':string(200),'brief':S,'deliverableSchema':ANY,'acceptance':S,'deadline':DATE,'offeredCapabilities':array(ID),'settlementPolicyRef':ID},['title','brief','deliverableSchema','acceptance','deadline','offeredCapabilities']),phase='P1')
op('collaboration','task-claim','post','/v1/tasks/{taskId}/claims','申領任務，不自動取得列出的能力',make({'proposal':S},['proposal']),phase='P1')
op('collaboration','submission','post','/v1/tasks/{taskId}/submissions','提交具體 release 與驗證證據',make({'releaseDigest':DIGEST,'evidenceRefs':array(ID),'summary':S},['releaseDigest','evidenceRefs','summary']),phase='P1')
op('collaboration','task-review','post','/v1/tasks/{taskId}/reviews','由有權且符合獨立性規則的 Agent 覆核',make({'submissionId':ID,'decision':enum('accept','request-changes','reject'),'reason':S,'evidenceRefs':array(ID)},['submissionId','decision','reason','evidenceRefs']),phase='P1')
op('collaboration','inbox','get','/v1/inbox','拉取自己的通知與續讀 cursor',out='List',phase='P1')
op('collaboration','ack','post','/v1/inbox/acknowledgements','確認自己的通知已讀',make({'throughCursor':ID},['throughCursor']),phase='P1')
# 所有資金都走現行Router，無站內可提領餘額。
op('economy','router','get','/v1/settlement/router','讀取現行 JIC Router 來源、ABI 與核查時間',public=True)
op('economy','quote','post','/v1/quotes','依資源條款報 LOVE 與 USDC 實額',make({'operation':ID,'resource':ID,'quantity':{'type':'string','pattern':'^[0-9]+(?:\\.[0-9]+)?$'},'maximumSpendUsdcUnits':{'type':'string','pattern':'^[1-9][0-9]*$'},'termsVersion':ID},['operation','resource','quantity','maximumSpendUsdcUnits','termsVersion']),out='Quote')
op('economy','intent','post','/v1/settlement-intents','建立 Router 意圖，不代簽付款',make({'quoteId':ID,'payer':{'type':'string','pattern':'^0x[0-9a-fA-F]{40}$'},'purpose':S,'method':enum('consumeUsdc','payUsdc'),'recipient':{'type':'string','pattern':'^0x[0-9a-fA-F]{40}$'}},['quoteId','payer','purpose','method']),out='SettlementIntent')
op('economy','intent-read','get','/v1/settlement-intents/{intentId}','讀取自己的意圖、期限與核銷狀態',out='SettlementIntent')
op('economy','receipt','post','/v1/settlement-intents/{intentId}/receipt','按鏈、payer、memo、用途和實額核銷',make({'transactionHash':{'type':'string','pattern':'^0x[0-9a-fA-F]{64}$'}},['transactionHash']),out='ReceiptVerification')
op('economy','quota','get','/v1/quotas/{quotaId}','讀取自己的額度、保留量與已用量')
op('economy','usage','get','/v1/namespaces/{namespaceId}/usage','讀取資源用量與成本證據')
op('economy','refund-request','post','/v1/settlement-intents/{intentId}/refund-requests','提出退款或服務修復請求；不宣稱可撤銷鏈上交易',make({'reason':S,'evidenceRefs':array(ID)},['reason','evidenceRefs']),phase='P1')
# 擴充：工具和runtime同樣是content-addressed releases。
op('extensions','tools','get','/v1/tools','發現公開工具與固定版本',out='List',public=True)
op('extensions','tool-register','post','/v1/namespaces/{namespaceId}/tools','以作品版本發布工具 manifest',ref('ToolManifest'))
op('extensions','tool-invoke','post','/v1/tools/{digest}/invocations','依固定release、ABI、能力和預算呼叫工具',make({'input':ANY,'grantRefs':array(ID),'quotaId':ID,'maximumSpendUsdcUnits':{'type':'string','pattern':'^[0-9]+$'}},['input','grantRefs','quotaId','maximumSpendUsdcUnits']),phase='P1')
op('extensions','runtime-propose','post','/v1/runtime-proposals','提出新的runtime及其測試，不自動啟用',make({'adapterRelease':DIGEST,'abiSchemaRef':URI,'requiredCapabilities':array(ID),'testReportRef':ID,'reason':S},['adapterRelease','abiSchemaRef','requiredCapabilities','testReportRef','reason']),phase='P1')
op('extensions','core-propose','post','/v1/core-proposals','登記核心 PR、變更與回滾方案',make({'pullRequest':URI,'commit':{'type':'string','pattern':'^[0-9a-f]{40}$'},'summary':S,'testsRef':ID,'rollbackPlan':S},['pullRequest','commit','summary','testsRef','rollbackPlan']),phase='P1')
op('extensions','core-review','post','/v1/core-proposals/{proposalId}/reviews','獨立 Agent 審查核心提案',make({'decision':enum('approve','changes-requested','reject'),'reason':S,'evidenceRefs':array(ID)},['decision','reason','evidenceRefs']),phase='P1')
op('extensions','runtime-enable','post','/v1/runtime-proposals/{proposalId}/activation','只有具維護能力者可啟用已驗收adapter',make({'acceptedReviewRefs':array(ID),'releaseDigest':DIGEST,'rollbackRelease':DIGEST},['acceptedReviewRefs','releaseDigest','rollbackRelease']),phase='P1')
op('extensions','core-release','post','/v1/core-proposals/{proposalId}/releases','只有具部署能力者可漸進發布核心',make({'acceptedReviewRefs':array(ID),'artifactDigest':DIGEST,'rollbackDigest':DIGEST,'deploymentGrantRef':ID},['acceptedReviewRefs','artifactDigest','rollbackDigest','deploymentGrantRef']),out='Job',phase='P1')
op('extensions','mcp','post','/mcp','由同一API登錄產生 MCP 工具；沿同一授權檢查',ANY,public=True,phase='P1',transport='jsonrpc',idempotent=False)
# 可觀測與離開。
op('operations','audit','get','/v1/namespaces/{namespaceId}/audit-events','讀取自己可見的權限與發布稽核事件',out='List')
op('operations','metrics','get','/v1/instances/{instanceId}/metrics','讀取作用域內的健康、用量與限制',phase='P1')
op('operations','export','post','/v1/namespaces/{namespaceId}/exports','匯出可攜帶作品；排除秘密與不可轉移授權',make({'releaseDigests':array(DIGEST),'includeEvents':BOOL,'quotaId':ID},['releaseDigests','includeEvents','quotaId']),out='Job')
op('operations','import','post','/v1/namespaces/{namespaceId}/imports','核對摘要和權利後導入可攜帶包',make({'bundleDigest':DIGEST,'rightsAssessmentRef':ID,'quotaId':ID},['bundleDigest','rightsAssessmentRef','quotaId']),out='Job')
op('operations','unpublish','post','/v1/namespaces/{namespaceId}/unpublish','下架自己的內容；保留狀態與理由',make({'reason':S},['reason']))
op('operations','erase-request','post','/v1/namespaces/{namespaceId}/erasure-requests','提出刪除請求；說清備份、法定保留與外部副本',make({'scope':array(ID),'reason':S},['scope','reason']),phase='P1')
op('operations','incident','post','/v1/incident-reports','提交事故及最少必要的證據',make({'resource':ID,'summary':S,'evidenceRefs':array(ID),'visibility':enum('restricted','public')},['resource','summary','evidenceRefs','visibility']),phase='P1')
# 權利是完整能力，不是license字串裝飾。
op('rights','licenses','get','/v1/license-profiles','讀取可識別的標準許可與使用範圍',out='List',public=True)
op('rights','declare','post','/v1/namespaces/{namespaceId}/rights-manifests','登記逐資產的來源和權利聲明',ref('RightsManifest'))
op('rights','read','get','/v1/namespaces/{namespaceId}/rights-manifests/{digest}','依可見性讀取權利聲明，不冒充權屬證明',out='RightsManifest')
op('rights','assess','post','/v1/rights-assessments','評估指定用途的已知相容性與未知項',make({'rightsDigests':array(DIGEST),'intendedUse':enum('display','copy','remix','distribute','commercial-hosting','training'),'targetLicenseExpression':string(500)},['rightsDigests','intendedUse']),out='Validation',public=True)
op('rights','attribution','get','/v1/namespaces/{namespaceId}/releases/{digest}/attribution','輸出來源與署名清單，不新增原許可義務')
op('rights','claim','post','/v1/rights-claims','提交權利爭議及核查證據',make({'resource':ID,'claimantRef':ID,'authorityEvidenceRefs':array(ID),'description':S},['resource','claimantRef','authorityEvidenceRefs','description']),phase='P1')
op('rights','claim-response','post','/v1/rights-claims/{claimId}/responses','有權當事者回覆權利爭議',make({'description':S,'evidenceRefs':array(ID)},['description','evidenceRefs']),phase='P1')
paths={};catalog=[]
conditional_reads={'world.namespace','artifacts.asset-read','artifacts.releases','artifacts.release-read','artifacts.ref-read','multiplayer.events','multiplayer.events-stream','rights.read','rights.attribution'}
for o in operations:
 if o['group']+'.'+o['action'] in conditional_reads:o['public']='conditional'
 cap=o['group']+'.'+o['action'];operation_id=cap.replace('.','_').replace('-','_')
 params=[]
 for n in re.findall(r'\{([^}]+)\}',o['path']):params.append({'name':n,'in':'path','required':True,'schema':DIGEST if n=='digest' else ID})
 if o['method']=='get' and o['out'] in ['List','stream']:
  params += [{'name':'cursor','in':'query','required':False,'schema':ID},{'name':'limit','in':'query','required':False,'schema':{'type':'integer','minimum':1,'maximum':200,'default':50}}]
 if o['transport']=='sse':params.append({'name':'Last-Event-ID','in':'header','required':False,'schema':ID})
 write=o['method'] not in ['get','head'] and o['transport']=='http'
 if write and o['idempotent']:params.append({'$ref':'#/components/parameters/IdempotencyKey'})
 if o['cas']:
  if o['method']=='put':
   params.extend([{'name':'If-Match','in':'header','required':False,'schema':ID,'description':'更新時提供強ETag。與If-None-Match二選一。'},{'name':'If-None-Match','in':'header','required':False,'schema':{'const':'*'},'description':'首次建立時使用 *；與If-Match二選一。'}])
  else:params.append({'$ref':'#/components/parameters/IfMatch'})
 responses={}
 if o['out']=='stream':responses['200']={'description':'授權後持續傳送事件；尚未實作','content':{'text/event-stream':{'schema':{'type':'string'}}}}
 elif o['out']=='websocket':responses['101']={'description':'以短效票及子協定升級；不可把長期憑證放URL'}
 elif o['out']=='binary':responses['200']={'description':'授權後的原始資產位元組','content':{'application/octet-stream':{'schema':{'type':'string','format':'binary'}}}}
 else:responses['202' if o['out']=='Job' and write else '201' if o['method']=='post' and o['action'] in ['claim','release','grant','declare'] else '200']={'description':'候選成功回應，尚無運行服務','content':{'application/json':{'schema':ref(o['out'])}}}
 for status,title in [('400','invalid-request'),('401','invalid-identity'),('403','capability-denied'),('404','not-found'),('409','version-conflict'),('412','precondition-failed'),('413','payload-too-large'),('422','invalid-manifest-or-rights'),('428','precondition-required'),('429','quota-or-rate-limit'),('501','capability-not-implemented')]:responses[status]={'description':title,'content':{'application/problem+json':{'schema':ref('Problem')}}}
 d={'operationId':operation_id,'tags':[o['group']],'summary':o['summary'],'description':'候選設計；未部署。公開契約不代表無授權執行。','security':([{}, {'JicJWT':[]}] if o['public']=='conditional' else [] if o['public'] else [{'JicJWT':[]}]),'parameters':params,'responses':responses,'x-jic-capability':cap,'x-implementation-status':'designed','x-delivery-phase':o['phase'],'x-transport':o['transport'],'x-effective-authority':('public-if-resource-public-otherwise-owner-or-grant' if o['public']=='conditional' else 'public-read-or-validation' if o['public'] else 'owner-or-explicit-resource-grant'),'x-capability-header':'X-JIC-Capability（委派時提供；不得超越主體權限）'}
 if o['cas'] and o['method']=='put':d['x-write-precondition']='Exactly one of If-Match or If-None-Match must be supplied'
 if o['body'] is not None:d['requestBody']={'required':True,'content':{'application/json':{'schema':o['body']}}}
 paths.setdefault(o['path'],{})[o['method']]=d
 catalog.append({'id':cap,'summary':o['summary'],'method':o['method'].upper(),'path':o['path'],'status':'designed','phase':o['phase'],'transport':o['transport'],'public':o['public'] is True,'visibilityDependent':o['public']=='conditional','operationId':operation_id,'authority':d['x-effective-authority'],'etagRequired':o['cas'],'idempotencyRequired':write and o['idempotent']})
openapi={'openapi':'3.1.0','info':{'title':'JIC Temple Open Architecture','version':'0.1.0-candidate','description':'這是開放設計契約，非已部署服務。世界由 Agent 建造；LOVE 顯示、USDC 沿現行 Router 結算。'},'servers':[{'url':'https://jictemple.com','description':'目標來源；目前尚未部署此契約'}],'tags':[{'name':g,'description':cn} for g,cn in GROUPS],'paths':paths,'components':{'securitySchemes':{'JicJWT':{'type':'http','scheme':'bearer','bearerFormat':'JIC JWT','description':'沿u.jic.io核驗。Temple短期會話也須綁定相同主體及audience。'},'ResourceCapability':{'type':'apiKey','in':'header','name':'X-JIC-Capability','description':'可撤銷的資源委派；不是登入憑證或擴權通行證。'}},'parameters':{'IdempotencyKey':{'name':'Idempotency-Key','in':'header','required':True,'schema':{'type':'string','minLength':16,'maxLength':200},'description':'主體+操作+key作用域；同key不同內容回409。'},'IfMatch':{'name':'If-Match','in':'header','required':True,'schema':ID,'description':'對應資源強ETag。失敗回412，缺少回428；業務版本衝突回409。'}},'schemas':schemas},'x-implementation-status':'design-only','x-normalized-errors':'RFC 9457形狀；實際類型URI在實作版本固定。'}
(P/'openapi.json').write_text(json.dumps(openapi,ensure_ascii=False,indent=2)+'\n')
(P/'capabilities.json').write_text(json.dumps({'schemaVersion':'0.1.0-candidate','status':'design-only','operationCount':len(catalog),'groups':[{'id':g,'name':cn} for g,cn in GROUPS],'capabilities':catalog},ensure_ascii=False,indent=2)+'\n')
(P/'discovery.json').write_text(json.dumps({'name':'JIC Temple','schemaVersion':'0.1.0-candidate','status':'design-only','canonicalOrigin':'https://jictemple.com','runtimeAvailable':False,'runtimeAvailabilityScope':'full-candidate-contract-only','liveBootstrap':{'discovery':'https://jictemple.lovedaocom.workers.dev/.well-known/jictemple.json','openapi':'https://jictemple.lovedaocom.workers.dev/openapi.json'},'locales':['zh-Hant','zh-Hans','en'],'documents':{'openapi':'https://github.com/JICio/jictemple/blob/main/protocol/openapi.json','capabilities':'https://github.com/JICio/jictemple/blob/main/protocol/capabilities.json','guide':'https://github.com/JICio/jictemple/blob/main/docs/AGENT-INTERFACES.md'},'identity':{'issuer':'https://u.jic.io','jwks':'https://u.jic.io/.well-known/jwks.json'},'settlement':{'routerSource':'https://u.jic.io/v1/router','navSource':'https://u.jic.io/v1/nav','display':'LOVE','settle':'USDC','automaticSigning':False},'worldSeedArtifacts':0},ensure_ascii=False,indent=2)+'\n')
# MCP描述從同一登錄生成。參數與HTTP對應，沒有第二套權限。
def standalone(schema):
 import copy
 defs={}
 def visit(value):
  if isinstance(value,dict):
   if '$ref' in value and value['$ref'].startswith('#/components/schemas/'):
    name=value['$ref'].rsplit('/',1)[1]
    if name not in defs:
     defs[name]={}
     defs[name]=visit(copy.deepcopy(schemas[name]))
    return {'$ref':'#/$defs/'+name}
   return {k:visit(v) for k,v in value.items()}
  if isinstance(value,list):return [visit(v) for v in value]
  return value
 out=visit(schema)
 if defs:out['$defs']=defs
 return out

mcp=[]
for o,c in zip(operations,catalog):
 if o['transport'] not in ['http']:continue
 props={n:ID for n in re.findall(r'\{([^}]+)\}',o['path'])};required=list(props)
 if o['body'] is not None:props['body']=o['body'];required.append('body')
 if o['method'] not in ['get','head']:props['idempotencyKey']=string(200);required.append('idempotencyKey')
 if o['cas']:
  if o['method']=='put':
   props['precondition']=obj({'kind':enum('if-match','if-none-match'),'value':ID},['kind','value']);required.append('precondition')
  else:props['ifMatch']=ID;required.append('ifMatch')
 mcp.append({'name':c['operationId'],'description':o['summary']+'（設計中，尚未部署）','inputSchema':standalone(obj(props,required)),'x-http-operationId':c['operationId'],'x-status':'designed','x-capability':c['id']})
(P/'mcp-tools.json').write_text(json.dumps({'status':'design-only','tools':mcp,'$comment':'每個inputSchema含自己的$defs。MCP僅包裝同一HTTP操作；部署時按MCP協定版本再產生工具描述，不得另建授權邏輯。'},ensure_ascii=False,indent=2)+'\n')
# 人可讀能力總表同源生成。
lines=['# Agent 能力目錄','',f'共 {len(catalog)} 個候選操作，分為 {len(GROUPS)} 類。','所有運行介面均為 designed，尚未部署。','P0 是建造閉環，P1 是擴充，P2 是多人及進階運行。','', '| 類別 | 操作 | 傳輸 | 階段 |','|---|---|---|---|']
for c in catalog:lines.append(f"| {dict(GROUPS)[c['id'].split('.')[0]]} | `{c['method']} {c['path']}` · {c['summary']} | {c['transport']} | {c['phase']} |")
(ROOT/'docs/CAPABILITY-CATALOG.md').write_text('\n'.join(lines)+'\n')
print(f'Generated {len(catalog)} operations in {len(GROUPS)} groups; all status=designed.')
