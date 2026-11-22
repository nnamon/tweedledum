"""Generates src/lib/lessons/more.ts: lessons 70 to 344, which follow the tutor's 69.

The words come from src/lib/lessons/words.ts; the sentences, phrases and names below were written
for Tweedledum. The output is the same every run (fixed random seed).
Run from the repository root: python3 scripts/more-lessons.py
"""

import json
import random
import re

R = random.Random(20261122)

src = open('src/lib/lessons/words.ts').read()
WORDS = src[src.index('`') + 1:src.rindex('`')].split()

# Every character the default layout types; each lesson is checked against it.
TYPEABLE = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !"#$%&\'()*+,-./:;=?@\\_<>[]^`{|}~')

lessons = []


def add(stage, text):
    text = re.sub(r'\s+', ' ', text).strip()
    bad = set(text) - TYPEABLE
    assert not bad, (stage, bad, text)
    lessons.append({'n': 70 + len(lessons), 'stage': stage, 'text': text})


def shuffled(xs):
    xs = list(xs)
    R.shuffle(xs)
    return xs


# ---- Common Words: 50 lessons, 20 new words each, with 10 from earlier lessons --------------------

for k in range(50):
    new = WORDS[20 * k:20 * k + 20]
    seen = WORDS[:20 * k]
    # The first lesson has nothing to review, so its words come twice.
    review = R.sample(seen, 10) if seen else []
    add('Common Words', ' '.join(shuffled(new + review) if seen else shuffled(new) + shuffled(new)))

# ---- Letter Groups: 25 lessons, 3 groups each, the group and then words that hold it ---------------

GROUPS = [
    'th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'ed',
    'is', 'it', 'al', 'ar', 'st', 'to', 'nt', 'ng', 'se', 'ha', 'ou', 'le', 've', 'co', 'me',
    'de', 'hi', 'ri', 'ro', 'ic', 'ne', 'ea', 'ra', 'ce', 'li', 'ch', 'll', 'be', 'ma', 'wh',
    'the', 'and', 'ing', 'ion', 'ent', 'for', 'her', 'ter', 'hat', 'ere', 'ate', 'his', 'con', 'ver', 'all',
    'ons', 'nce', 'men', 'ith', 'ers', 'pro', 'ess', 'not', 'ive', 'was', 'ect', 'com', 'per', 'est', 'tion',
]
assert len(GROUPS) == 75
for k in range(25):
    parts = []
    for g in GROUPS[3 * k:3 * k + 3]:
        having = [w for w in WORDS if g in w and w != g]
        parts.append(' '.join([g, g] + R.sample(having, min(8, len(having)))))
    add('Letter Groups', ' '.join(parts))

# ---- Capitals: 15 lessons ---------------------------------------------------------------------------

DAYS = 'Monday Tuesday Wednesday Thursday Friday Saturday Sunday'.split()
MONTHS = 'January February March April May June July August September October November December'.split()
NAMES = ('Ada Ben Cara Dev Elin Femi Gus Hana Ivo Jun Kit Lena Milo Nia Omar Pia Quinn Rosa Sam Tove '
         'Uma Viktor Wren Xia Yusuf Zara').split()
PLACES = ('London Paris Oslo Lima Cairo Delhi Tokyo Seoul Lagos Quito Perth Dublin Vienna Madrid Rome '
          'Berlin Prague Nairobi Austin Boston Glasgow Leeds Bristol Cardiff York Bath').split()
CAPS = 'BBC USB PDF GPS DIY FAQ HTML CSS NASA UK EU UN DNA TV PC ID CEO VIP OK ASAP'.split()
SHORT = [w for w in WORDS[:400] if len(w) > 2]
for k in range(15):
    words = [w.capitalize() for w in R.sample(SHORT, 8)]
    if k < 5:
        names = R.sample(NAMES, 6) + R.sample(DAYS, 2)
    elif k < 10:
        names = R.sample(PLACES, 6) + R.sample(MONTHS, 2)
    else:
        names = R.sample(CAPS, 5) + R.sample(NAMES, 2) + R.sample(PLACES, 1)
    pairs = [f'{R.choice(NAMES)} and {R.choice(NAMES)} met in {R.choice(PLACES)} on {R.choice(DAYS)}.'
             for _ in range(2)]
    add('Capitals', ' '.join(shuffled(words + names)) + ' ' + ' '.join(pairs))

# ---- Numbers: 20 lessons ----------------------------------------------------------------------------


def num_item(kind):
    r = R.randint
    if kind == 'digits':
        return ''.join(str(r(0, 9)) for _ in range(r(3, 5)))
    if kind == 'year':
        return str(r(1066, 2030))
    if kind == 'time':
        return f'{r(0, 23)}:{r(0, 59):02d}'
    if kind == 'date':
        return f'{r(1, 28):02d}/{r(1, 12):02d}/{r(1990, 2030)}'
    if kind == 'price':
        return f'${r(1, 250)}.{r(0, 99):02d}'
    if kind == 'percent':
        return f'{r(1, 100)}%'
    if kind == 'sum':
        a, b = sorted((r(2, 99), r(2, 99)), reverse=True)
        op = R.choice('+-*')
        return f'{a} {op} {b} = {eval(f"{a}{op}{b}")}'
    if kind == 'measure':
        return f'{r(1, 99)}.{r(0, 9)} {R.choice(["km", "kg", "cm", "mm", "ml", "g", "m", "l"])}'
    if kind == 'weight':
        return f'{r(1, 99)}.{r(0, 9)} {R.choice(["kg", "g"])}'
    if kind == 'phone':
        return f'0{r(100, 999)} {r(100, 999)} {r(1000, 9999)}'
    if kind == 'count':
        return f'{r(2, 12)} {R.choice(["eggs", "cups", "pens", "books", "chairs", "trees", "boats", "rooms"])}'
    raise ValueError(kind)


NUM_PLAN = [
    ['digits'], ['digits'], ['year'], ['time'], ['date'], ['price'], ['percent'], ['sum'], ['measure'], ['phone'],
    ['digits', 'year'], ['time', 'date'], ['price', 'percent'], ['sum', 'measure'], ['count', 'price'],
    ['year', 'count', 'time'], ['date', 'phone', 'sum'], ['measure', 'percent', 'price'],
    ['digits', 'time', 'sum', 'count'], ['year', 'date', 'price', 'measure', 'percent'],
]
NUM_LINES = [
    'The train leaves at {time} and costs {price}.',
    'We counted {count} on {date}.',
    'Prices rose by {percent} in {year}.',
    'Call {phone} before {time}.',
    'The box weighs {weight}.',
    'Check that {sum}.',
]
for kinds in NUM_PLAN:
    items = [num_item(R.choice(kinds)) for _ in range(14)]
    line = R.choice(NUM_LINES)
    line = re.sub(r'\{(\w+)\}', lambda m: num_item(m.group(1)), line)
    add('Numbers', ' '.join(items) + ' ' + line)

# ---- Punctuation: 20 lessons ------------------------------------------------------------------------

CONTRACTIONS = "don't can't won't isn't aren't wasn't it's I'm you're we're they're I've you've we'd she'll that's there's let's".split()


NOUNS = ('house water food car city tree river book room friend fish horse door ship fire road map rain town '
         'machine field garden boat window table chair train bird dog cat paper song letter school farm island '
         'forest bridge kitchen station market shop coat hat bag box cup plate clock lamp phone wall floor').split()


def pick(n, pool=WORDS[:600]):
    return R.sample(pool, n)


def punct(theme):
    w = pick
    if theme == 'comma':
        return ' '.join(f'{a}, {b}, {c} and {d}.' for a, b, c, d in (w(4, NOUNS) for _ in range(5)))
    if theme == 'stop':
        return ' '.join(f'{a.capitalize()} {b}. {c.capitalize()} {d}.' for a, b, c, d in (w(4) for _ in range(5)))
    if theme == 'apostrophe':
        return ' '.join(R.sample(CONTRACTIONS, 12)) + ' ' + ' '.join(f"the {a}'s {b}" for a, b in (w(2, NOUNS) for _ in range(4)))
    if theme == 'question':
        return ' '.join(f'{R.choice(["Why", "How", "When", "Where", "What", "Who"])} {a} {b}? {c.capitalize()}!' for a, b, c in (w(3) for _ in range(5)))
    if theme == 'quote':
        return ' '.join(f'"{a} {b}," {R.choice(NAMES)} said. \'{c}\'' for a, b, c in (w(3) for _ in range(5)))
    if theme == 'bracket':
        return ' '.join(f'{a} ({b} {c}) [{d}]' for a, b, c, d in (w(4) for _ in range(6)))
    if theme == 'colon':
        return ' '.join(f'{a}: {b}; {c}: {d};' for a, b, c, d in (w(4) for _ in range(6)))
    if theme == 'hyphen':
        return ' '.join(f'{a}-{b} {c}-{d}-{e}' for a, b, c, d, e in (w(5) for _ in range(6)))
    if theme == 'slash':
        return ' '.join(f'{a}/{b} {c}_{d} ~/{e}' for a, b, c, d, e in (w(5) for _ in range(6)))
    if theme == 'at':
        return ' '.join(f'{a}@{b}.com #{c} {d}&{e}' for a, b, c, d, e in (w(5) for _ in range(6)))
    if theme == 'code':
        lines = []
        for _ in range(6):
            a, b, c = R.sample(['x', 'y', 'n', 'i', 'total', 'count', 'size', 'name'], 3)
            lines.append(R.choice([
                f'{a} = {b} + {c};', f'if ({a} < {b}) {{ {c}++; }}', f'{a}[{b}] = "{c}";',
                f'{a} >= {b} && {c} != 0', f'`{a} | {b}`', f'{a} ^ {b} % {c}', f'<{a}>{b}</{a}>', f'C:\\{a}\\{b}',
            ]))
        return ' '.join(lines)
    raise ValueError(theme)


PUNCT_PLAN = [
    'comma', 'stop', 'apostrophe', 'question', 'quote', 'bracket', 'colon', 'hyphen', 'slash', 'at', 'code',
    'comma', 'apostrophe', 'quote', 'bracket', 'colon', 'hyphen', 'at', 'code', 'code',
]
for theme in PUNCT_PLAN:
    add('Punctuation', punct(theme))

# ---- Sentences: 60 lessons, written for Tweedledum, shorter ones first --------------------------------

SENTENCES = """
The cat sat by the open door.
We walked home in the rain.
My sister has a red bike.
The shop opens at nine.
Our dog likes the beach.
He made tea for everyone.
The sun came out after lunch.
She left her keys on the desk.
I read two books this week.
The bus was late again.
They planted a tree in the park.
We ate soup and fresh bread.
The baby slept all night.
His phone fell into the sink.
The river was cold and fast.
Please close the window.
The kettle is on.
Birds sang outside at dawn.
She wrote a letter to her aunt.
The film starts in ten minutes.
He painted the fence green.
Our team won the last game.
The wind blew the hat away.
I found a coin under the sofa.
We need milk, eggs and butter.
The road to the farm is narrow.
Mum baked a cake for the party.
The lights went out at midnight.
The library is quiet on Sundays.
The garden needs more water.
A fox crossed the road in front of us.
The old clock in the hall still keeps good time.
We waited for the ferry with a flask of coffee.
She learnt to swim when she was six.
The market sells fruit, fish and flowers.
He keeps a notebook in his coat pocket.
The children built a castle out of sand.
Snow fell all night and covered the hills.
The museum has a room full of old maps.
They argued about the best way to cook rice.
The plane landed a few minutes early.
My grandfather grew beans and potatoes.
I left the umbrella on the train again.
The new bridge took three years to build.
A small boat drifted past the harbour wall.
We sat on the steps and watched the sunset.
The teacher drew a map on the board.
She keeps her bike in the shed behind the house.
The cafe on the corner makes the best toast.
He fixed the leaking tap with an old washer.
The orchestra tuned up before the concert.
Fog rolled in from the sea after dark.
The puppy chewed one of my shoes.
We climbed to the top and ate lunch there.
The report is due at the end of the month.
Her garden is full of bees in the summer.
Two owls live in the barn by the lane.
He forgot the password and had to reset it.
The soup tasted better on the second day.
We heard thunder far away over the hills.
The station clock was five minutes fast, so we nearly missed the train.
She practised the piano every evening until the piece felt easy.
If you add a little salt, the vegetables will taste much sweeter.
The village hall was packed for the meeting about the new road.
After the storm, the beach was covered in seaweed and driftwood.
He tried to fold the map back the way it came, and gave up.
The best time to plant bulbs is in the autumn, before the frost.
Our neighbours keep chickens, so we never run out of eggs.
The guide pointed out a heron standing still in the reeds.
Most of the shops close early on a Sunday, so go in the morning.
We took the long way round to avoid the traffic in town.
The recipe says to rest the dough for an hour before baking.
She typed the whole report with one hand while holding her coffee.
The lake froze over, and people walked across it to the island.
A good night's sleep makes the hardest problem look smaller.
The museum is free, but the special exhibition costs extra.
The kids raced paper boats down the stream behind the school.
He wrote the shopping list on the back of an old envelope.
The path follows the river for two miles and then climbs.
The baker starts work at four, long before anyone else is awake.
Keep the receipt in case the shoes don't fit.
The hotel had a view of the harbour and a very noisy seagull.
We counted the stars until the clouds rolled in.
The garage said the car would be ready by Thursday.
Some people learn best by reading, and others by doing.
The parcel arrived torn, but everything inside was fine.
She labelled every jar in the kitchen, even the empty ones.
It took us an hour to find a place to park.
The concert was outside, so we brought blankets and a flask.
His handwriting is so small that he needs a magnifying glass to read it.
The bakery on the high street sells out of bread by noon on Saturdays.
When the power cut came, we played cards by candlelight until late.
The ferry crossing takes about forty minutes when the sea is calm.
She keeps a spare key under a flower pot, which everyone knows about.
The first thing he does each morning is open every window in the house.
They spent the whole weekend painting the kitchen a pale shade of yellow.
The footpath was closed, so we walked along the edge of the field instead.
My phone has more photos of the cat than of anything else.
The plumber arrived on time, which surprised everyone in the office.
We followed the signs for the castle and ended up at a garden centre.
The old railway line is now a cycle path that runs all the way to the coast.
The meeting ran over, so we ate our sandwiches on the way to the station.
He swore he would never buy another houseplant, and then bought three.
The wind was so strong that the umbrellas turned inside out.
She can recite the bus timetable from memory, which is oddly useful.
At low tide you can walk out to the island, but watch the time.
The library lets you borrow tools as well as books.
The tomatoes ripened all at once, so we made sauce for a week.
Nobody remembered who had suggested the picnic once it started to rain.
The repair took ten minutes; finding the right screwdriver took an hour.
He practised his speech in the car, at every red light.
A chord keyboard feels strange at first, then quietly becomes normal.
Every chord you learn makes the next one a little easier to find.
Typing without looking is less about speed and more about trust.
Slow, accurate practice builds speed faster than rushing ever does.
The twelve keys sit under four fingers, three keys to a finger.
Short daily sessions beat one long session at the weekend.
When a chord feels awkward, slow down and let your hand learn the shape.
The thumb buttons change what the finger chords type.
Some words have a chord of their own, which saves several presses.
Missed keys are not failures; they show you what to practise next.
The fastest typists make few mistakes, so they rarely stop to correct them.
It helps to say each letter quietly as you press its chord.
After a week, the common letters stop needing any thought at all.
Rest your hand between runs, especially if your wrist starts to ache.
Look at the screen, not at your hand, even when it feels slower.
The kitchen smelled of toast, coffee and, faintly, burnt porridge.
We booked a table for six, but eleven people turned up.
The map was older than the road, so it was not much help.
She replied to every email before nine, then switched off her phone.
The hill looked gentle from the bottom and cruel from halfway up.
Our train was cancelled, so we shared a taxi with two strangers.
He keeps every receipt in a shoebox, sorted by month.
The children named the goldfish after their headteacher.
Someone left a bicycle chained to the railings for three years.
The forecast promised sun; we got hail, then a rainbow.
I meant to write one page and ended up writing ten.
They finished the puzzle, apart from one piece of sky that was missing.
On clear nights you can see the lights of the next town across the bay.
The night bus was warm, quiet and full of people trying not to fall asleep.
The cheapest seats were at the back, where you could hear every whisper.
Her grandmother's recipe book has notes in three different pens.
The lift was broken, so we carried the sofa up five flights of stairs.
By the time the kettle boiled, he had forgotten why he wanted tea.
The beach was empty in November, apart from a man with four dogs.
We agreed to meet at the clock tower, then waited at different ones.
The noise from the building site started at seven every morning.
She signed up for a pottery class and made eleven slightly lopsided bowls.
The boat rocked gently while we ate sandwiches and watched the gulls.
He labelled the boxes "kitchen", "books" and "misc", and then filled every one with misc.
The town has two cinemas, one bakery and, for some reason, four shops that sell only hats.
We tried to follow the instructions, but step 7 seemed to belong to a different wardrobe.
Their flat is on the top floor, with a view of the gasworks and, on clear days, the sea.
She ran the first mile far too fast and spent the next two regretting it.
The cafe gives you a free coffee after nine stamps, and I'm on eight for the third time.
It is much easier to keep a garden tidy than to rescue one that has been left for a year.
When the clocks went back, the dog still wanted his breakfast at the old time.
The bookshop has a sofa at the back where people read whole novels without buying them.
Our quiz team came second, mostly because nobody knew the capital of Australia.
The bridge opens twice a day to let tall ships through, and the traffic waits patiently.
He keeps meaning to learn to cook, but toast remains the high point of his week.
I asked for directions and got a ten-minute history of the town instead.
The waves were small but steady, which is perfect for learning to surf.
The postman knows every dog on his round by name, and most of them know him.
We planted the seeds in April and were eating salad from the garden by June.
""".strip().split('\n')

assert len(set(SENTENCES)) == len(SENTENCES)
i = 0
for k in range(60):
    parts = []
    while sum(len(s) + 1 for s in parts) < 120:
        parts.append(SENTENCES[i])
        i += 1
    add('Sentences', ' '.join(parts))
print('sentences used', i, 'of', len(SENTENCES))

# ---- Code: 25 lessons, mostly the terminal, simple lines first ---------------------------------------

CODE = r"""
ls -la
cd ~/projects
pwd
mkdir -p notes/2026
cat README.md
less /var/log/syslog
cp config.yml config.yml.bak
mv draft.txt final.txt
rm -rf build/
touch .env
echo "hello" > hello.txt
echo $HOME
head -n 20 access.log
tail -f /var/log/nginx/error.log
wc -l *.py
grep -rn "TODO" src/
grep -i error app.log | wc -l
find . -name "*.tmp" -delete
find ~/Downloads -size +100M -type f
du -sh * | sort -h
df -h /
ps aux | grep python
kill -9 4242
top -o %CPU
history | tail -n 30
chmod +x deploy.sh
chmod 600 ~/.ssh/id_ed25519
chown -R www-data:www-data /srv/site
sudo apt update && sudo apt upgrade -y
which python3
export PATH="$HOME/.local/bin:$PATH"
source .venv/bin/activate
alias ll='ls -lah'
ln -s ~/dotfiles/.vimrc ~/.vimrc
tar -czf backup.tar.gz ~/notes
tar -xzf release-1.4.2.tar.gz -C /opt
zip -r site.zip public/
curl -s https://api.example.com/status | jq .
curl -fsSL -o install.sh https://example.com/install.sh
wget -q https://example.com/data.csv
ssh -p 2222 deploy@10.0.0.12
scp report.pdf user@host:~/inbox/
rsync -avz --delete public/ web:/srv/site/
ssh-keygen -t ed25519 -C "laptop"
git status
git add -p
git commit -m "Fix the login redirect"
git push origin main
git pull --rebase
git checkout -b feature/search
git log --oneline --graph -n 15
git diff HEAD~1 -- src/app.ts
git stash && git stash pop
git reset --hard origin/main
git rebase -i HEAD~3
git tag -a v0.2.0 -m "Release 0.2.0"
docker ps -a
docker compose up -d
docker compose logs -f web
docker build -t myapp:latest .
docker run --rm -it -v "$PWD":/app node:20 bash
docker exec -it db psql -U postgres
systemctl status nginx
sudo systemctl restart sshd
journalctl -u nginx --since "1 hour ago"
crontab -e
sed -i 's/localhost/127.0.0.1/g' hosts.txt
awk -F, '{ sum += $3 } END { print sum }' sales.csv
cut -d: -f1 /etc/passwd | sort | uniq
for f in *.png; do convert "$f" "${f%.png}.jpg"; done
while read -r line; do echo "$line"; done < list.txt
if [ -f .env ]; then set -a; . ./.env; fi
xargs -n 1 -P 4 curl -O < urls.txt
npm install --save-dev vitest
pip install -r requirements.txt
python3 -m http.server 8000
make clean && make -j8
clear
man tar
date +%Y-%m-%d
uptime
whoami
hostname -I
ping -c 4 example.com
ip addr show
ss -tlnp
nc -zv db.local 5432
dig +short example.com
traceroute 8.8.8.8
uname -a
free -h
lsblk
sudo mount /dev/sdb1 /mnt/usb
diff -u old.conf new.conf
sort -u names.txt > unique.txt
tr '[:upper:]' '[:lower:]' < input.txt
tee build.log < output.txt
cat a.txt b.txt > both.txt
ls ~/.config/*/ | head
grep -v "^#" .env | grep -v "^$"
find . -mtime -1 -name "*.log" | xargs ls -l
less +F server.log
nohup ./worker.sh > worker.out 2>&1 &
jobs -l
fg %1
screen -S build
tmux new -s dev
tmux attach -t dev
openssl rand -hex 16
base64 -d token.txt
sha256sum release.tar.gz
gpg --verify release.tar.gz.sig
git clone git@github.com:example/project.git
git remote -v
git branch -d old-feature
git cherry-pick 3f9a2c1
git blame -L 40,60 src/main.rs
git bisect start
docker image prune -a
docker volume ls
kubectl get pods -n prod
kubectl logs -f deploy/api -n prod
0 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
def add(a, b): return a + b
for i in range(10): print(i ** 2)
with open("data.json") as f: data = json.load(f)
const total = items.reduce((sum, x) => sum + x.price, 0);
if (user && user.isAdmin) { showPanel(); }
fetch("/api/users").then((r) => r.json()).then(render);
SELECT name, email FROM users WHERE active = 1 ORDER BY name;
UPDATE orders SET status = 'shipped' WHERE id = 1024;
^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$
{"name": "tweedledum", "version": "0.1.4", "private": true}
""".strip().split('\n')
assert len(set(CODE)) == len(CODE), [c for c in CODE if CODE.count(c) > 1]
TERMINAL = CODE[:CODE.index('kubectl logs -f deploy/api -n prod') + 1]


PROGRAM = CODE[len(TERMINAL):]


def join_code(lines):
    # Shell commands are joined with "; ", which runs them one after another. A command sent to the
    # background already ends in "&", and other lines (code, a crontab entry) are joined with a space.
    out = lines[0]
    for prev, line in zip(lines, lines[1:]):
        shell = prev in TERMINAL and line in TERMINAL and not prev.endswith('&')
        out += ('; ' if shell else ' ') + line
    return out


# 20 lessons of terminal lines, split by length so every line is used, then 5 of other code.


def split_even(lines, n):
    total = sum(len(x) + 2 for x in lines)
    out, cur, acc = [], [], 0
    for x in lines:
        cur.append(x)
        acc += len(x) + 2
        if acc >= total * (len(out) + 1) / n and len(out) < n - 1:
            out.append(cur)
            cur = []
    out.append(cur)
    assert len(out) == n and all(out), [len(c) for c in out]
    return out


for parts in split_even(TERMINAL, 20) + split_even(PROGRAM, 5):
    add('Code', join_code(parts))
i = len(TERMINAL)
print('terminal lines used', i, 'of', len(TERMINAL), '; code lines', len(PROGRAM))

# ---- Phrases: 30 lessons, 6 new phrases each with 4 from earlier ones --------------------------------

PHRASES = """
of the|in the|to the|on the|and the|for the|to be|it is|at the|with the
from the|by the|that the|this is|there is|there are|I am|I think|a lot of|one of the
as well as|at least|in order to|as soon as|at the same time|in front of|on top of|out of|because of|such as
more than|less than|each other|so that|even though|as long as|in fact|of course|for example|at first
at last|after all|right now|all the time|every day|next week|last year|this morning|in the end|on the other hand
by the way|as far as|all over the world|it was|there was|he said|she said|they were|we will|you can
I would like|would you like|could you|can you|let me know|thank you|see you soon|how are you|what is the|where is the
when is the|why not|not yet|so far|up to|a bit|a few|a little|more or less|sooner or later
here and there|now and then|again and again|little by little|side by side|step by step|day after day|from time to time|once again|the rest of
part of the|most of the|some of the|all of the|none of the|the end of|the top of|the first time|the next day|the same way
the other side|in the morning|in the evening|at night|on time|in time|on the way|by the end|at home|at work
going to|have to|need to|want to|used to|able to|about to|has been|have been|had been
will be|would be|could be|should be|might be|must be|it is not|do not|does not|did not
is not|was not|cannot|will not|would not|and then|and so|and also|and now|and yet
the people|the world|the government|the problem|the question|the answer|the rest|the point|the reason|the idea
in terms of|in the case of|at the end of|in the middle of|on the basis of|as a result of|in spite of|in addition to|with regard to|according to
nothing to do with|for the first time|at the moment|in the meantime|on the whole|in general|in particular|in other words|at any rate|by no means
the thing is|the fact that|the way that|the time when|the place where|the reason why|the man who|the day that|the one that|the kind of
""".strip().replace('\n', '|').split('|')
assert len(PHRASES) == 180, len(PHRASES)
for k in range(30):
    new = PHRASES[6 * k:6 * k + 6]
    old = PHRASES[:6 * k]
    review = R.sample(old, 4) if len(old) >= 4 else []
    add('Phrases', ' '.join(shuffled(new + review + new)))

# ---- Speed: 15 sprints on the most common words ------------------------------------------------------

for k in range(15):
    top = WORDS[:50 + 10 * k]
    add('Speed', ' '.join(R.choice(top) for _ in range(40)))

# ---- Review: 15 lessons mixing everything -------------------------------------------------------------

for k in range(15):
    parts = [
        R.choice(SENTENCES),
        ' '.join(R.sample(WORDS[:500], 6)),
        num_item(R.choice(['time', 'price', 'date', 'percent', 'sum', 'measure'])),
        R.choice(PHRASES),
        R.choice(SENTENCES),
        R.choice([
            '{}, {}, {} and {}.'.format(*R.sample(NOUNS, 4)),
            ' '.join(R.sample(CONTRACTIONS, 4)),
            '"{} {}," {} said.'.format(*R.sample(WORDS[:300], 2), R.choice(NAMES)),
            '{} ({}) [{}]'.format(*R.sample(NOUNS, 3)),
        ]),
        R.choice(TERMINAL),
    ]
    add('Review', ' '.join(parts))

assert len(lessons) == 275, len(lessons)

HEADER = '''// Lessons 70 to 344, written for Tweedledum to follow the tutor's 69: common words, letter groups,
// capitals, numbers, punctuation, sentences, code, phrases, speed and review. Generated by
// scripts/more-lessons.py; do not edit by hand.

import type { TutorLesson } from './tutor';

export const MORE_LESSONS: TutorLesson[] = '''
open('src/lib/lessons/more.ts', 'w').write(HEADER + json.dumps(lessons, ensure_ascii=False, indent=2) + ';\n')
print(len(lessons), 'lessons,', min(len(l['text']) for l in lessons), 'to', max(len(l['text']) for l in lessons), 'characters')
