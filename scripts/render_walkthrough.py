"""Render a silent, captioned walkthrough from real browser captures.

Requires Pillow and imageio-ffmpeg. Browser captures live under ignored artifacts/.
No UI is fabricated: annotations and camera crops are editorial overlays.
"""
from pathlib import Path
import json, math, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parents[1]
FRAMES=ROOT/'media-source/frames'
OUT=ROOT/'public/media'
OUT.mkdir(parents=True,exist_ok=True)
W,H,FPS=1920,1080,20
FONT=next(str(p) for p in [Path('/System/Library/Fonts/Supplemental/Arial.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')] if p.exists())
BOLD=next(str(p) for p in [Path('/System/Library/Fonts/Supplemental/Arial Bold.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')] if p.exists())
fonts={s:ImageFont.truetype(FONT,s) for s in [18,20,22,24,26,28,32,38,44,54,64]}
bolds={s:ImageFont.truetype(BOLD,s) for s in [18,20,22,24,26,28,32,38,44,54,64]}
BG='#102e25';MINT='#b8d99d';WHITE='#f4f6ee';MUTED='#b9cbbf'
# filename, seconds, chapter, headline, narration, product rationale, optional crop
scenes=[
(None,6,'CLEARPATH REVIEW','A campaign is ready.\nIs it ready to launch?','Follow Sarah in compliance and Alex in marketing as one affiliate campaign moves from risky copy to a defensible decision.','Actual product interactions · Edited walkthrough · No audio needed',None),
('01-queue',7,'01 / TRIAGE','Start with the work\nthat needs attention.','Sarah opens a prioritized queue: escalations, distribution holds, and overdue reviews.','THROUGHPUT\nReduce time spent reconstructing status from spreadsheets and email.',None),
('02-find-campaign',5,'01 / TRIAGE','One campaign.\nAll its context.','Search brings Alex’s affiliate campaign into focus. Ownership, channel, version, and due date travel together.','DESIGN CHOICE\nA clear next action beats another inbox.',(250,470,1440,1000)),
('03-risky-copy',9,'02 / REVIEW','“Guaranteed approval”\nis a problem.','Sarah sees the exact creative beside two advisory findings. The partner’s destination copy is part of the review too.','EDGE CASE\nA safe-looking ad can lead to a misleading landing page.',(270,280,1440,1000)),
('04-request-feedback',8,'02 / REVIEW','Feedback should\nbe actionable.','Sarah explains what must change: remove the promise, qualify eligibility, and clarify credit inquiries. Approval stays blocked.','PRODUCT THINKING\nSpecific feedback reduces avoidable revision loops.',(800,250,1440,1000)),
('05-owner-handoff',6,'03 / REVISE','The next move\nbelongs to Alex.','The campaign changes state. Alex can read the feedback and revise the submitted creative.','OWNERSHIP\nOne accountable owner; one visible handoff.',None),
('06-revised-creative',9,'03 / REVISE','Change the copy.\nKeep the scope aligned.','Alex revises both the advertisement and captured landing-page copy. The new wording qualifies approval and inquiry claims.','EDGE CASE\nChanging only the ad is insufficient when the destination still overpromises.',(400,170,1040,850)),
('07-version-authorship',8,'03 / REVISE','Version 2 starts\na fresh review.','The previous copy and review evidence remain available. New creative invalidates earlier evidence and sign-offs.','AUDITABILITY\nNo approval silently follows changed creative.',(780,220,1440,930)),
('08-no-self-approval',7,'03 / REVISE','The author cannot\napprove the work.','Alex can submit the revision, but cannot approve it. The decision belongs to an independent compliance reviewer.','SEPARATION OF DUTIES\nThese are local workflow identities, not authenticated accounts.',(790,260,1440,1000)),
('09-evidence-required',7,'04 / SUBSTANTIATE','No flags does not\nmean cleared.','Sarah resumes the review. The rewritten creative has no automated flags, but evidence and human checks are still required.','HUMAN JUDGMENT\nPre-checks assist reviewers; they do not provide legal clearance.',(790,250,1440,950)),
('10-add-evidence',9,'04 / SUBSTANTIATE','Show the basis\nfor the decision.','Sarah records the product terms, source reference, and validity date. Evidence belongs to this creative version.','EVIDENCE QUALITY\nThe source is a manual reference, not an automatically verified document.',(400,170,1040,850)),
('11-checklist-empty',2,'04 / SUBSTANTIATE','Human review\nstill matters.','Verify terms, substantiate claims, and check the audience and distribution scope.','ACCOUNTABILITY\nEach completed check enters the activity history.',(790,220,1440,950)),
('11a-check-one',1,'04 / SUBSTANTIATE','Human review\nstill matters.','Verify terms, substantiate claims, and check the audience and distribution scope.','ACCOUNTABILITY\nEach completed check enters the activity history.',(790,220,1440,950)),
('11b-check-two',2,'04 / SUBSTANTIATE','Human review\nstill matters.','Verify terms, substantiate claims, and check the audience and distribution scope.','ACCOUNTABILITY\nEach completed check enters the activity history.',(790,220,1440,950)),
('12-expiry-blocked',9,'04 / SUBSTANTIATE','A small date error.\nA meaningful safeguard.','Sarah first chooses December 31. The evidence expires December 15, so approval remains disabled.','EDGE CASE\nAn approval cannot outlive its supporting evidence.',(800,300,1440,1000)),
('13-ready-to-approve',6,'05 / DECIDE','Now the decision\nis supported.','Sarah shortens the approval period, records her rationale, and completes the required checks.','REVIEW GATE\nVersion, evidence, policy, scope, and reviewer must all align.',(790,300,1440,1000)),
('14-approved-snapshot',9,'05 / DECIDE','Launch ready.\nFor this exact version.','The approval stores an exportable snapshot of the creative, evidence, scope, policy, reviewer, and rationale.','PRODUCT THINKING\n“Approved” is a recorded decision, not a permanent label.',None),
('15-policy-library',6,'06 / AFTER APPROVAL','Then the rules change.','A new eligibility requirement affects personal-loan advertising. Sarah opens the versioned policy library.','LIFECYCLE\nCompliance continues after the first approval.',None),
('16-policy-impact',8,'06 / AFTER APPROVAL','See the impact\nbefore publishing.','The policy update identifies two approved campaigns that will need re-review. Sarah documents what changed.','CHANGE MANAGEMENT\nMake the consequences visible before confirming.',(400,280,1040,760)),
('18-distribution-hold',9,'06 / AFTER APPROVAL','Yesterday’s approval\nis not today’s clearance.','Alex’s campaign moves to a distribution hold because it was reviewed under the previous policy version.','EDGE CASE\nPolicy changes remove launch clearance without rewriting history.',(260,80,1440,800)),
('19-revoke-reason',8,'06 / AFTER APPROVAL','Stop distribution.\nKeep the evidence.','Sarah records why the placement must stop while disclosures are corrected and independently reviewed again.','CONTROL\nRevocation requires lead authority and a meaningful reason.',(400,380,1040,900)),
('20-audit-chain',9,'06 / AFTER APPROVAL','The whole story\nis still here.','The activity chain connects feedback, revision, evidence, approval, policy change, and revocation.','AUDIT TRAIL\nA reviewer can explain what happened and why.',(790,260,1440,1000)),
('21-history-preserved',6,'06 / AFTER APPROVAL','Revoke the clearance,\nnot the record.','The original approval snapshot is still exportable, along with the earlier creative version and its review evidence.','RETENTION\nHistorical decisions stay distinct from current launch readiness.',(790,250,1440,1000)),
('22-overview',8,'07 / KEEP WORK MOVING','Manage capacity\nand distribution risk.','The overview separates open reviews from approval holds and shows reviewer workload and descriptive cycle-time metrics.','MEASUREMENT\nDemo metrics are not proof of a throughput improvement.',None),
('24-reviewer-handoff',7,'07 / KEEP WORK MOVING','When Sarah is busy,\nownership can move.','A reasoned handoff sends another campaign to Jamie. Reviewer attestations reset; evidence and history remain.','EDGE CASE\nThe new reviewer must verify the work, not inherit unchecked confidence.',(400,240,1040,800)),
('25-manual-finding',8,'07 / KEEP WORK MOVING','Automation will\nmiss things.','Jamie adds a manual finding about disclosure prominence—something a simple text pre-check cannot assess.','HUMAN OVERSIGHT\nThe workflow supports reviewer judgment beyond the rule engine.',(400,260,1040,800)),
('26-own-team-dialog',9,'08 / TRY YOUR OWN WORK','Bring your team.\nBring your campaign.','Create local owners, reviewers, and leads with your own names. Keep the sample people or use your own identities.','SELF-SERVE\nNo account or invitation needed. Everything stays in this browser.',(400,250,1040,850)),
('23-structured-intake',9,'08 / TRY YOUR OWN WORK','A real brief,\nnot a fixed demo path.','Submit your own copy, partner, channel, audience, and destination. The same review controls apply to every submission.','INTAKE QUALITY\nIncomplete scope and duplicate creative are caught before review.',(430,0,1010,1000)),
(None,9,'CLEARPATH REVIEW','Faster reviews.\nClearer accountability.','Try your own campaign in the live app. Paste copy or import a .txt/.md file, then choose an independent reviewer.','Browser-local prototype · No real authentication or shared backend\nProduction requires server-side roles, durable storage, and protected audit retention.',None),
]
# Use newer captures for the final self-serve segment when available.
if (FRAMES/'27-own-team.jpg').exists():
 scenes[-3]=('27-own-team',9,'08 / TRY YOUR OWN WORK','Bring your team.\nBring your campaign.','Priya and Jordan are custom local identities. Anyone can test the workflow with their own names, content, and review ownership.','SELF-SERVE\nNo invitations are sent. Data remains in this browser.',None)
if (FRAMES/'28-own-intake.jpg').exists():
 scenes[-2]=('28-own-intake',9,'08 / TRY YOUR OWN WORK','Paste it. Import it.\nPut it through review.','Import a .txt or .md file, or paste campaign copy. Choose a reviewer and capture the actual distribution scope.','SAFE IMPORT\nFiles are read locally. Invalid files are rejected; existing copy is not silently overwritten.',(400,0,1060,1000))

scenes[-1:-1]=[
 ('30-own-reviewer',7,'08 / TRY YOUR OWN WORK','Your content.\nThe same safeguards.','Priya’s imported campaign is assigned to Jordan. A custom reviewer follows the same evidence, checklist, and approval rules as the sample team.','EXTENSIBILITY\nThis is a working intake flow, not a fixed sequence of demo screens.',None),
 ('31-stale-tab',8,'09 / RELIABILITY','Two tabs must not\noverwrite each other.','A change in one tab warns the other. Stale writes are blocked until the workspace is refreshed; typed form drafts remain available.','PRODUCTION THINKING\nWeb Locks and revision checks prevent accidental lost updates within one browser.',(250,50,1440,790)),
]

def wrap(draw,text,font,width):
 result=[]
 for para in text.split('\n'):
  line=''
  for word in para.split():
   candidate=(line+' '+word).strip()
   if draw.textlength(candidate,font=font)>width and line:result.append(line);line=word
   else:line=candidate
  result.append(line)
 return result

def textblock(draw,text,xy,font,fill,width,linegap=10):
 x,y=xy
 for line in wrap(draw,text,font,width):
  draw.text((x,y),line,font=font,fill=fill);y+=font.size+linegap
 return y

def stamp(seconds):
 ms=round(seconds*1000);return f'{ms//3600000:02}:{(ms//60000)%60:02}:{(ms//1000)%60:02}.{ms%1000:03}'

def compose(scene,index,t,total_elapsed,total_duration,source=None):
 filename,duration,chapter,title,body,why,crop=scene
 frame=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(frame)
 d.text((44,32),'clearpath.',font=bolds[32],fill=WHITE)
 d.text((250,40),'MARKETING COMPLIANCE',font=fonts[18],fill=MUTED)
 d.text((1470,41),'PRODUCT WALKTHROUGH',font=fonts[18],fill=MINT)
 d.line((44,91,1876,91),fill='#355146',width=1)
 if source is None:
  d.rounded_rectangle((80,165,1840,925),radius=28,fill='#193b2e',outline='#385a46',width=2)
  d.text((140,220),chapter,font=bolds[20],fill=MINT)
  y=textblock(d,title,(140,300),bolds[64],WHITE,1450,18)
  y=textblock(d,body,(142,y+40),fonts[32],MUTED,1380,14)
  textblock(d,why,(142,790),fonts[24],MINT,1470,12)
  if filename is None and index==0:
   d.rounded_rectangle((1415,220,1750,266),radius=23,fill='#2a503c');d.text((1440,230),'SILENT · CAPTIONED',font=bolds[18],fill=MINT)
 else:
  # Captured product state. The camera briefly settles on the relevant controls.
  box=crop or (0,0,source.width,source.height)
  im=source
  iw,ih=im.size
  x=42+(1280-iw)//2;y=120+(880-ih)//2
  d.rounded_rectangle((34,112,1330,1008),radius=14,fill='#273f34',outline='#48614f',width=1)
  frame.paste(im,(x,y))
  d=ImageDraw.Draw(frame)
  # Editorial captions enter after the recorded state appears; never cover controls.
  ease=min(1,max(0,(t-.2)/.45));offset=int(24*(1-ease))
  if ease>0:
   d.text((1380,142+offset),chapter,font=bolds[18],fill=MINT)
   yy=textblock(d,title,(1378,205+offset),bolds[44],WHITE,465,12)
   yy=textblock(d,body,(1380,yy+36),fonts[26],MUTED,455,13)
   if t>1.6:
    d.line((1380,yy+30,1845,yy+30),fill='#49604e',width=1)
    tag,_,detail=why.partition('\n')
    d.text((1380,yy+55),tag,font=bolds[18],fill=MINT)
    textblock(d,detail,(1380,yy+92),fonts[24],WHITE,455,12)
  # A small focus marker arrives with the caption, without simulating a click.
  if t<1 and t>.25:
   d.rounded_rectangle((36,114,1328,1006),radius=14,outline=MINT,width=2)
 d.text((44,1030),'Actual app interactions · Edited for clarity · Fictional financial company',font=fonts[18],fill=MUTED)
 d.text((1740,1030),f'{index+1:02} / {len(scenes):02}',font=fonts[18],fill=MINT)
 d.rectangle((0,1074,W,1080),fill='#284739')
 d.rectangle((0,1074,int(W*(total_elapsed+t)/total_duration),1080),fill=MINT)
 return frame

if __name__=='__main__':
 (ROOT/'artifacts/walkthrough').mkdir(parents=True,exist_ok=True)
 total=sum(s[1] for s in scenes);elapsed=0;vtt=['WEBVTT',''];chapters=[]
 command=[imageio_ffmpeg.get_ffmpeg_exe(),'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'clearpath-walkthrough.mp4')]
 proc=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=open(ROOT/'artifacts/walkthrough/render.log','w'))
 previous=None
 for idx,scene in enumerate(scenes):
  source=Image.open(FRAMES/f'{scene[0]}.jpg').convert('RGB') if scene[0] else None
  if source is not None:
   if scene[6]:source=source.crop(scene[6])
   scale=min(1280/source.width,880/source.height)
   source=source.resize((round(source.width*scale),round(source.height*scale)),Image.Resampling.LANCZOS)
  chapters.append({'at':elapsed,'chapter':scene[2],'title':scene[3].replace('\n',' ')})
  vtt += [str(idx+1),f'{stamp(elapsed)} --> {stamp(elapsed+scene[1])}',scene[3].replace('\n',' '),scene[4],scene[5].replace('\n',': '),'']
  for f in range(round(scene[1]*FPS)):
   t=f/FPS;frame=compose(scene,idx,t,elapsed,total,source)
   if previous is not None and f<5:frame=Image.blend(previous,frame,(f+1)/5)
   proc.stdin.write(frame.tobytes())
   if f==round(scene[1]*FPS)-1:previous=frame
  frame.save(ROOT/f'artifacts/walkthrough/review-{idx:02}.jpg',quality=85)
  if idx==0:frame.save(OUT/'clearpath-walkthrough-poster.jpg',quality=92)
  elapsed+=scene[1];print(f'{idx+1}/{len(scenes)} {scene[2]} · {elapsed}s',flush=True)
 proc.stdin.close();code=proc.wait()
 if code:raise SystemExit(f'FFmpeg failed: {code}')
 (OUT/'clearpath-walkthrough.vtt').write_text('\n'.join(vtt))
 (ROOT/'artifacts/walkthrough/chapters.json').write_text(json.dumps(chapters,indent=2))
 print(f'COMPLETE {elapsed}s { (OUT/"clearpath-walkthrough.mp4").stat().st_size/1024/1024:.1f} MB',flush=True)
