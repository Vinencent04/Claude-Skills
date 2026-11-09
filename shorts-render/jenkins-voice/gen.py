import json,subprocess,sys
from lines import LINES
for i,(tag,txt) in enumerate(LINES):
    body=json.dumps({"text":tag+" "+txt,"model_id":"eleven_v3","voice_settings":{"stability":0.0,"similarity_boost":0.75,"style":1.0,"use_speaker_boost":True,"speed":1.2}})
    subprocess.run(["curl","-s","-X","POST","https://api.elevenlabs.io/v1/text-to-speech/QhpsGjDKZmM9qRYdMhBD?output_format=mp3_44100_128","-H","xi-api-key: dummy","-H","Content-Type: application/json","-d",body,"-o",f"l/l{i:02d}.mp3"],check=True)
    subprocess.run(["ffmpeg","-v","error","-y","-i",f"l/l{i:02d}.mp3","-ar","24000","-ac","1",f"l/l{i:02d}.wav"],check=True)
