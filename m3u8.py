import os, sys

out = open("./list.m3u8", 'w')
out.write('#EXTM3U\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXT-X-TARGETDURATION:10\n#EXT-X-VERSION:4\n#EXT-X-MEDIA-SEQUENCE:0\n')

files = os.listdir(".")
files = sorted(filter(lambda f: f.endswith(".ts"), files), key=lambda f: int(f.split("_")[0]))

for f in files:
  duration = f.replace(".ts", "").split("_")[1]
  out.write("#EXTINF:{},\n{}\n".format(duration, f))

out.write("#EXT-X-ENDLIST\n")