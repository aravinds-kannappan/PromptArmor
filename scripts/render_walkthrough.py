"""Caption a real Chrome tab recording, preserving cursor movement and UI transitions.

Authoring dependencies: Pillow, imageio-ffmpeg. The app has neither dependency.
The source is a browser MediaRecorder stream, not a sequence of screenshots.
"""
from pathlib import Path
import json, subprocess, math
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/media'; WORK=ROOT/'artifacts/live-walkthrough'; WORK.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'media-source/clearpath-live-source.mkv'
timing=json.loads((ROOT/'media-source/live-timing.json').read_text())
events={e['name']:e for e in timing['events']}
# Align the action log to the browser capture clock, then remove long idle gaps.
origin=timing['stopAt']/1000-timing['sourceDuration']
PACE=1.25
trim_start=events['01-prioritize']['start']/1000-origin-1
trim_end=min(timing['sourceDuration'],events['52-audit']['end']/1000-origin+5)
intervals=[]
for e in timing['events']:
 a=max(trim_start,e['start']/1000-origin-.6); b=min(trim_end,e['end']/1000-origin+4)
 if b<=a: continue
 if intervals and a<=intervals[-1][1]: intervals[-1][1]=max(b,intervals[-1][1])
 else: intervals.append([a,b])
def mapped(t):
 return sum(max(0,min(t,b)-a) for a,b in intervals)*PACE
DURATION=sum(b-a for a,b in intervals)*PACE
font=next(str(p) for p in [Path('/System/Library/Fonts/Supplemental/Arial.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')] if p.exists())
fontname='Arial' if 'Arial' in font else 'DejaVu Sans'
# Action, chapter, title, narration, product rationale. Offsets use capture seconds.
cues=[
('01-prioritize','01 / PRIORITIZE','Start with the work that matters.','Sarah checks workload, overdue reviews, and distribution holds before opening the queue.','THROUGHPUT\nPut ownership and the next action in one place.'),
('02-queue','01 / PRIORITIZE','Find the campaign. Keep its context.','Search brings an overdue affiliate campaign into focus. Sarah opens the exact submitted creative.','INTAKE\nProduct, partner, reviewer, and due date travel together.'),
('04-open-risk','02 / REVIEW','The promise needs to change.','The pre-check flags guaranteed approval and the credit-inquiry claim. Sarah writes specific revision feedback.','AFFILIATE EDGE CASE\nReview both the ad and its destination wording.'),
('07-switch-owner','03 / REVISE','The next move belongs to Alex.','Switch to the marketing owner. The campaign is waiting for a revision, not another email thread.','OWNERSHIP\nReviewers request changes; the owner edits creative.'),
('09-revise-open','03 / REVISE','Revise the ad and the destination.','Alex qualifies eligibility and explains inquiry stages in both texts, then submits version 2.','VERSION CONTROL\nChanged creative starts a fresh review.'),
('12-versions','03 / REVISE','Old copy stays. Old sign-offs do not.','Both versions remain visible. Alex cannot approve the work; the decision returns to Sarah.','SEPARATION OF DUTIES\nAuthors cannot approve their own campaign.'),
('15-evidence','04 / SUBSTANTIATE','No flags is not clearance.','Sarah opens Evidence and adds the product terms that substantiate the revised claims.','HUMAN DECISION\nAutomated checks are advisory.'),
('17-evidence-fill','04 / SUBSTANTIATE','Evidence has a source and an expiry.','Record a terms excerpt, source URL, and validity date. Evidence belongs to this creative version.','SCOPE\nThe source reference is manually captured, not independently fetched.'),
('20-checklist','05 / DECIDE','A reviewer must attest to the checks.','Sarah verifies disclosures, substantiation, and distribution scope against the current evidence.','ACCOUNTABILITY\nEvidence changes and reviewer handoffs reset attestations.'),
('21-attest+6.3','05 / DECIDE','Approval cannot outlive the evidence.','December 31 is blocked because the terms expire December 15. Sarah corrects the date.','DATE BOUNDARY\nThe approval window is constrained by supporting terms.'),
('23-approve','05 / DECIDE','A decision becomes a snapshot.','Click Approve. The exact version, policy, rationale, and expiry are preserved.','LAUNCH READY\nClearance applies only to the recorded scope.'),
('24-policy-library','06 / AFTER APPROVAL','Policy changes have consequences.','Sarah opens the policy library. Before publishing, the app shows how many approvals will need re-review.','CHANGE MANAGEMENT\nPreview the impact before changing policy.'),
('26-publish-policy','06 / AFTER APPROVAL','Publish policy. Hold older approvals.','The new inquiry-disclosure guidance immediately removes launch clearance from affected campaigns.','IMPORTANT DISTINCTION\nPreviously approved does not mean currently launch-ready.'),
('28-held-campaign','06 / AFTER APPROVAL','Stop distribution with a reason.','The campaign displays its policy hold. Sarah also revokes the approval and records the next step.','CONTROL\nRevocation removes clearance without deleting the decision.'),
('31-history','06 / AFTER APPROVAL','The original decision survives.','Open Versions: the previous approval snapshot is still available after revocation.','AUDITABILITY\nHistory explains what was approved and why it later stopped.'),
('32-team','07 / YOUR OWN TEAM','Now start with your own people.','The sample identities stay available. Add Priya as a marketing owner and Morgan as a reviewer.','SELF-SERVE\nThese are browser-local identities, not authenticated accounts.'),
('36-reviewer-name','07 / YOUR OWN TEAM','Give the reviewer the right role.','Enter Morgan’s name, choose Compliance reviewer, and save. Then switch to Priya.','SAME RULES\nCustom people use the same workflow permissions as sample people.'),
('40-new-campaign','08 / NEW CAMPAIGN','Create a campaign from scratch.','Priya opens New submission and chooses Morgan as the independent reviewer.','BRING YOUR OWN WORK\nPaste copy or import a local .txt / .md file.'),
('43-name-campaign','08 / NEW CAMPAIGN','The brief adapts to its channel.','Name the campaign and select Email. Affiliate destination requirements become optional.','CONTEXT MATTERS\nCapture the actual distribution channel and scope.'),
('45-brief-details','08 / NEW CAMPAIGN','Your copy. Your team. Your audience.','Priya enters the team, deadline, California audience, and campaign copy, then submits for review.','STRUCTURED INTAKE\nA complete brief reduces avoidable reviewer follow-up.'),
('46-submit-custom','08 / NEW CAMPAIGN','A real submission enters review.','The new campaign is assigned to Morgan. Priya can see it, but cannot approve her own work.','EXTENSIBILITY\nThis is a working intake flow, not a fixed demo path.'),
('48-jordan-review','09 / HUMAN JUDGMENT','Automation will miss things.','Morgan opens the campaign and adds a finding about disclosure prominence in the final email layout.','REVIEWER JUDGMENT\nA text pre-check cannot assess visual placement.'),
('51-human-gate','09 / HUMAN JUDGMENT','The same safeguards still apply.','The manual finding is open and approval remains blocked until it is resolved with rationale.','CONSISTENCY\nCustom campaigns follow the same evidence and decision gates.'),
('52-audit','10 / TRACEABILITY','One visible chain of decisions.','The audit joins the sample campaign and the new submission: revisions, evidence, approvals, and ownership.','PRODUCTION BOUNDARY\nBrowser-local data is editable. Production needs server-side roles and durable audit retention.'),
]
def at(key):
 name,_,offset=key.partition('+')
 return max(0,mapped(events[name]['start']/1000-origin+float(offset or 0)))
starts=[0]+[at(c[0]) for c in cues[1:]]
def wrap(text,size,width=390):
 f=ImageFont.truetype(font,size); lines=[]
 for para in text.split('\n'):
  line=''
  for word in para.split():
   trial=(line+' '+word).strip()
   if f.getlength(trial)>width and line:lines.append(line);line=word
   else:line=trial
  lines.append(line)
 return r'\N'.join(lines)
def astime(t):
 cent=round(t*100);return f'{cent//360000}:{cent//6000%60:02}:{cent//100%60:02}.{cent%100:02}'
def vtttime(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: 2560
PlayResY: 1440
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Chapter,{fontname},24,&H009DD9B8,&H009DD9B8,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: Title,{fontname},48,&H00EEF6F4,&H00EEF6F4,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: Body,{fontname},31,&H00BFCBB9,&H00BFCBB9,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: Reason,{fontname},28,&H00EEF6F4,&H00EEF6F4,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
lines=[header];vtt=['WEBVTT\n'];chapters=[]
for i,(key,chapter,title,body,reason) in enumerate(cues):
 start=starts[i];end=starts[i+1] if i+1<len(cues) else DURATION
 for style,y,text,size,delay in [('Chapter',225,chapter,24,0),('Title',290,title,48,0),('Body',535,body,31,.18),('Reason',825,reason,28,.45)]:
  value=wrap(text,size)
  lines.append(f'Dialogue: 0,{astime(start+delay)},{astime(end)},{style},,0,0,0,,{{\\pos(2035,{y})\\fad(180,120)}}{value}')
 vtt.append(f'{i+1}\n{vtttime(start)} --> {vtttime(end)}\n{title} {body}\n{reason.replace(chr(10),": ")}\n')
 if not chapters or chapters[-1]['label']!=chapter:chapters.append({'time':round(start,2),'label':chapter})
(WORK/'callouts.ass').write_text('\n'.join(lines))
(OUT/'clearpath-walkthrough.vtt').write_text('\n'.join(vtt))
(WORK/'chapters.json').write_text(json.dumps({'duration':DURATION,'chapters':chapters},indent=2))
frame=Image.new('RGBA',(2560,1440),(0,0,0,0));d=ImageDraw.Draw(frame)
def label(x,y,text,size,color):d.text((x,y),text,font=ImageFont.truetype(font,size),fill=color)
label(42,44,'clearpath.',48,'#f4f6ee');label(310,62,'MARKETING COMPLIANCE',23,'#b9cbbf')
label(1985,62,'LIVE PRODUCT WALKTHROUGH',24,'#b8d99d')
d.line((40,124,2520,124),fill='#355146',width=2)
d.rounded_rectangle((38,188,1962,1234),radius=6,outline='#456354',width=2)
d.line((2035,785,2500,785),fill='#456354',width=2)
label(42,1302,'Actual browser recording · Visible cursor · Silent, with timed explanations',25,'#b9cbbf')
label(42,1350,'Sample campaign → Review → Approval → Policy change → Your own team and campaign',23,'#b8d99d')
label(2035,1310,'Fictional company',24,'#b9cbbf');label(2035,1350,'Browser-local prototype',23,'#b9cbbf')
frame.save(WORK/'frame.png')
ff=imageio_ffmpeg.get_ffmpeg_exe()
selection='+'.join(f'between(t,{a-trim_start},{b-trim_start})' for a,b in intervals)
cmd=[ff,'-y','-hide_banner','-ss',str(trim_start),'-t',str(trim_end-trim_start),'-i',str(SOURCE),'-i',str(WORK/'frame.png'),'-filter_complex',f"[0:v]scale=1920:1042:flags=lanczos,fps=30,select='{selection}',setpts={PACE}*N/30/TB,pad=2560:1440:40:190:color=0x102e25[screen];[screen][1:v]overlay=0:0,ass=artifacts/live-walkthrough/callouts.ass[v]",'-map','[v]','-an','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-t',str(DURATION),str(OUT/'clearpath-walkthrough.mp4')]
with (WORK/'render.log').open('w') as log:subprocess.run(cmd,cwd=ROOT,stdout=log,stderr=log,check=True)
subprocess.run([ff,'-y','-v','error','-ss','7','-i',str(OUT/'clearpath-walkthrough.mp4'),'-frames:v','1',str(OUT/'clearpath-walkthrough-poster.jpg')],check=True)
print(json.dumps({'duration':DURATION,'sizeMB':round((OUT/'clearpath-walkthrough.mp4').stat().st_size/1e6,1),'chapters':chapters}))
