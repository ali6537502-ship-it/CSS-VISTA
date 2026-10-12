"""Original, bounded reasoning lessons. Imported only by the authoring tool.
Every fixed answer is checked by enumerating the stated formal rule, not AI.
"""
import itertools
import hashlib

def value(formula, p, q):
    return {'P':p,'Q':q,'!P':not p,'!Q':not q,'P->Q':not p or q,'Q->P':not q or p,'!Q->!P':q or not p,'!P->!Q':p or not q,'!P->Q':p or q}[formula]

def correct(proof, options):
    kind=proof['type']
    if kind=='logic':
        worlds=[(p,q) for p,q in itertools.product([False,True],repeat=2) if all(value(f,p,q) for f in proof['given'])]
        assert worlds
        rules=[(p,q) for p,q in itertools.product([False,True],repeat=2) if all(value(f,p,q) for f in proof['given'] if '->' in f)]
        values=[all(value(option.removeprefix('rule:'),p,q) for p,q in (rules if option.startswith('rule:') else worlds)) for option in proof['formulas']]
        matches=[i for i,v in enumerate(values) if v==(proof.get('task','entailed')=='entailed')]
    elif kind=='order':
        def valid(order):
            return all(order.index(a)<order.index(b) for a,b in proof.get('before',[])) and all(abs(order.index(a)-order.index(b))==1 for a,b in proof.get('adjacent',[])) and all(order[int(n)]==who for n,who in proof.get('fixed',[]))
        matches=[i for i,option in enumerate(options) if set(option)==set(proof['people']) and len(option)==len(proof['people']) and valid(option)]
    elif kind=='shift':
        result=''.join(chr((ord(c)-65+proof['shift'])%26+65) for c in proof['word'])
        matches=[i for i,v in enumerate(options) if v==result]
    elif kind=='classify':
        predicates={'even':lambda n:n%2==0,'prime':lambda n:n>=2 and all(n%d for d in range(2,int(n**.5)+1)),'square':lambda n:int(n**.5)**2==n,'multiple3':lambda n:n%3==0,'cube':lambda n:any(k**3==n for k in range(1,30))}
        pred=predicates[proof['property']];matches=[i for i,v in enumerate(options) if not pred(int(v))]
    else:raise ValueError(kind)
    assert len(matches)==1,(proof,options,matches)
    return matches[0]

def append(units):
    def make(slug,title,summary):
        unit=dict(id=slug,title=title,stage='Logical reasoning',summary=summary,lessons=[],quiz=[]);units.append(unit);return unit
    def exercise(unit,prompt,options,proof,explanation,quiz=False):
        target=unit['quiz'] if quiz else unit['lessons'];number=len(target)+1
        identity=f'{unit["id"]}-'+('quiz-' if quiz else 'practice-')+str(number)
        rotation=hashlib.sha256(identity.encode()).digest()[0]%4
        order=list(range(rotation,4))+list(range(rotation))
        options=[options[i] for i in order];proof=dict(proof)
        if 'formulas' in proof:proof['formulas']=[proof['formulas'][i] for i in order]
        return dict(id=identity,prompt=prompt,unit='listed option',kind='choice',options=options,answer=correct(proof,options),proof=proof,explanation=explanation)
    def add(unit,title,idea,rule,worked,steps,prompt,options,proof,explanation):
        number=len(unit['lessons'])+1
        q=exercise(unit,prompt,options,proof,explanation)
        unit['lessons'].append(dict(id=f'{unit["id"]}-{number}',title=title,idea=idea,rule=rule,example=dict(problem=worked,steps=steps),exercise=q))
    def quiz(unit,prompt,options,proof,explanation):unit['quiz'].append(exercise(unit,prompt,options,proof,explanation,True))
    u=make('logical-reasoning','Logical reasoning & conditional statements','Separate valid inference from assumptions using the stated premises alone.')
    add(u,'Use a sufficient condition','If P then Q says that whenever P holds, Q must hold. It does not say that Q has only one possible cause.','P → Q and P together entail Q.','If a card is red, it is marked. This card is red. What follows?',['Write red as P and marked as Q.','The rule and P give Q: the card is marked.'],'If a file is urgent (P), it is flagged (Q). It is urgent. What must follow?',['It is flagged.','It is not flagged.','It is not urgent.','Every flagged file must be urgent.'],dict(type='logic',given=['P->Q','P'],formulas=['Q','!Q','!P','rule:Q->P']),'The stated rule applies because the sufficient condition P is present.')
    add(u,'Avoid reversing a condition','A result does not identify its only cause. If P implies Q, seeing Q alone does not establish P.','Check a counterexample: P false and Q true can satisfy P → Q.','If a card is red it is marked. A card is marked. Is it necessarily red?',['A blue card could also be marked.','The rule never said only red cards are marked.','Do not infer red from marked alone.'],'Given P → Q and Q, which statement is NOT guaranteed?',['P is true.','Q is true.','If P is true, Q is true.','If Q is false, P is false.'],dict(type='logic',given=['P->Q','Q'],formulas=['P','Q','P->Q','!Q->!P'],task='not_entailed'),'The case P false and Q true satisfies both premises, so P is not guaranteed.')
    add(u,'Use the contrapositive','A conditional statement has an equivalent contrapositive: if the result is absent, its sufficient condition cannot be present.','P → Q entails not Q → not P.','If a valid pass exists, entry is allowed. Entry is not allowed. What follows under this stated rule?',['Let valid pass be P and allowed entry be Q.','Q is false. If P were true the rule would require Q.','Therefore P must be false.'],'Given P → Q and not Q, what must be true?',['Not P.','P.','Q.','Q implies P.'],dict(type='logic',given=['P->Q','!Q'],formulas=['!P','P','Q','rule:Q->P']),'P would force Q, contradicting not Q, so not P follows. The converse is not guaranteed by the rule alone.')
    quiz(u,'A permit (P) requires a signature (Q). A permit exists. Which follows?',['A signature exists.','No signature exists.','No permit exists.','Every signature produces a permit.'],dict(type='logic',given=['P->Q','P'],formulas=['Q','!Q','!P','rule:Q->P']),'The sufficient condition P is present, so Q follows.')
    quiz(u,'If P then Q. Given not Q, choose the valid conclusion.',['Not P.','P.','Q.','If P is false, Q must be true.'],dict(type='logic',given=['P->Q','!Q'],formulas=['!P','P','Q','!P->Q']),'A true P would imply Q and contradict not Q.')
    quiz(u,'If P then Q. Which conditional is equivalent?',['If not Q then not P.','If Q then P.','If not P then not Q.','P must be true.'],dict(type='logic',given=['P->Q'],formulas=['!Q->!P','Q->P','!P->!Q','P']),'The contrapositive retains the same truth conditions.')
    quiz(u,'If P then Q. P is false. Which is NOT guaranteed?',['Q is false.','P is false.','If P then Q.','If not Q then not P.'],dict(type='logic',given=['P->Q','!P'],formulas=['!Q','!P','P->Q','!Q->!P'],task='not_entailed'),'Q may still be true for another reason; denying P does not determine Q.')
    quiz(u,'If P then Q and Q is true, which is NOT guaranteed?',['If Q then P.','Q is true.','If P then Q.','If not Q then not P.'],dict(type='logic',given=['P->Q','Q'],formulas=['Q->P','Q','P->Q','!Q->!P'],task='not_entailed'),'The converse can fail when Q is true and P is false.')
    u=make('ordering-arrangements','Ordering & arrangements','Translate each stated restriction into positions, test all constraints, and avoid assuming a unique arrangement.')
    add(u,'Before and after','Before specifies relative order; it does not necessarily mean immediately before. List positions left to right and test the rule.','A before B means position(A) < position(B).','Arrange A, B and C with C before A. Is BCA allowed?',['C is second and A third.','C is before A even though B comes first.','The listed order BCA is allowed.'],'A must come before B. Which listed order is allowed?',['ACB','BAC','BCA','CBA'],dict(type='order',people='ABC',before=[['A','B']]),'In ACB, A is before B. Each other listed arrangement puts B before A.')
    add(u,'Adjacent positions','Adjacent means next to each other, with no position between. Unless the order is specified, either direction can meet an adjacency rule.','Adjacent positions differ by exactly one.','In CADB, are A and D adjacent?',['A occupies position 2; D position 3.','Their position difference is 1.','They are adjacent.'],'A and B must be adjacent and C must be first. Which listed order is allowed?',['CABD','CADB','CDAB','ACBD'],dict(type='order',people='ABCD',adjacent=[['A','B']],fixed=[[0,'C']],before=[['B','D']]),'The prompt also needs B before D for a unique listed answer.')
    # Include every formal constraint in the actual question; no hidden rules.
    u['lessons'][-1]['exercise']['prompt']='A and B must be adjacent, C first, and B before D. Which listed order is allowed?'
    add(u,'Combine restrictions','Test each rule independently. A plausible-looking order may satisfy one condition and violate another. Eliminate only when a stated rule fails.','Check fixed positions, relative order and adjacency separately.','D must be last; A before B. Test CABD.',['D is last.','A is second, before B in third.','Both stated rules hold.'],'D must be last, A before B, and C before A. Which order works?',['CABD','ACBD','CBAD','DABC'],dict(type='order',people='ABCD',fixed=[[3,'D']],before=[['A','B'],['C','A']]),'CABD satisfies all three rules; the alternatives violate at least one.')
    for prompt,options,proof,explanation in [
      ('B before C and A last: choose a valid listed order.',['BCA','CBA','ABC','CAB'],dict(type='order',people='ABC',before=[['B','C']],fixed=[[2,'A']]),'BCA places B before C and A last.'),
      ('A first and D before B: which listed order works?',['ADCB','ABCD','DACB','ACBD'],dict(type='order',people='ABCD',fixed=[[0,'A']],before=[['D','B']]),'Only ADCB meets both stated rules among the options.'),
      ('B and C adjacent, A first, D last: choose the allowed option.',['ABCD','ACDB','BACD','ADBC'],dict(type='order',people='ABCD',fixed=[[0,'A'],[3,'D']],adjacent=[['B','C']]),'ABCD keeps A first, D last and B next to C.'),
      ('C before A before B, D last: choose the allowed option.',['CABD','ACBD','CBAD','BCAD'],dict(type='order',people='ABCD',fixed=[[3,'D']],before=[['C','A'],['A','B']]),'The relative order C, A, B and final D give CABD.'),
      ('A and D adjacent, B first and C last: choose a valid listed order.',['BADC','ABDC','BACD','BDCA'],dict(type='order',people='ABCD',fixed=[[0,'B'],[3,'C']],adjacent=[['A','D']]),'BADC has the required endpoints and adjacent A/D.')]:quiz(u,prompt,options,proof,explanation)
    u=make('coding-decoding','Coding & decoding','Use the explicitly stated coding rule, handle alphabet wraparound, and reverse a code without guessing a pattern.')
    add(u,'Apply a stated shift','A letter code changes symbols according to a given rule. A limited example alone can admit many rules; use the rule provided in the question.','For a shift of +1, A → B and Z → A.','Shift DOG forward by one.',['D → E; O → P; G → H.','The code is EPH.'],'Shift CAT forward by one letter, wrapping Z to A.',['DBU','DBT','CBU','DZU'],dict(type='shift',word='CAT',shift=1),'C → D, A → B, T → U, so CAT becomes DBU.')
    add(u,'Wrap around the alphabet','Alphabet positions run from 0 to 25 for calculation. Add the shift and take the remainder after division by 26.','New position = (old position + shift) mod 26.','Shift ZOO forward by two.',['Z wraps to B; O becomes Q.','The result is BQQ.'],'Shift YAK forward by three letters with wraparound.',['BDN','BDM','ABN','CBN'],dict(type='shift',word='YAK',shift=3),'Y → B, A → D, K → N, giving BDN.')
    add(u,'Reverse the stated code','Decoding reverses each step of the given transformation. A forward shift of three is undone by a backward shift of three.','Subtract the encoding shift and wrap around.','Decode FDW if the encoding used a forward shift of three.',['F → C, D → A, W → T.','The original word is CAT.'],'Decode EPH if encoding shifted each letter forward by one.',['DOG','FOI','DPG','DNG'],dict(type='shift',word='EPH',shift=-1),'Move E, P and H one place backward to D, O and G.')
    for word,shift,options in [('SUN',2,['UWP','TVO','UWO','VWP']),('ZEBRA',1,['AFCSB','AECQB','ZFCSB','BGDTC']),('BOOK',-1,['ANNJ','CPPL','ANOJ','BNNJ']),('AXE',3,['DAH','DAF','CXH','EBI']),('BCD',-2,['ZAB','ABC','CDE','YZA'])]:quiz(u,f'Shift {word} by {shift:+d} alphabet positions; wrap around at either end.',options,dict(type='shift',word=word,shift=shift),'Apply the stated shift to every letter, using alphabet wraparound; the answer is '+''.join(chr((ord(c)-65+shift)%26+65) for c in word)+'.')
    u=make('classification','Classification & the stated odd one out','Classify with an explicit common property rather than relying on a guessed pattern or a subjective association.')
    add(u,'Use an explicit property','An odd-one-out task needs a stated or defensible grouping rule. Several rules can fit a short list; this course states the property to avoid ambiguity.','Even integers are divisible by two with no remainder.','Among 12, 18, 21 and 26, find the one that is not even.',['12, 18 and 26 divide by two.','21 does not, so it is the odd one out under this rule.'],'Which number is NOT even?',['14','22','31','48'],dict(type='classify',property='even'),'31 is odd; the other three are divisible by two.')
    add(u,'Prime versus composite','A prime is an integer greater than one with exactly two positive divisors. One is not prime. Test factors up to the square root.','A composite integer greater than one has a nontrivial divisor.','Among 11, 13, 15 and 17, which is not prime?',['15 = 3 × 5.','11, 13 and 17 have no nontrivial divisor.','15 is the exception.'],'Which of these numbers is NOT prime?',['19','23','27','29'],dict(type='classify',property='prime'),'27 = 3 × 9; the other listed numbers are prime.')
    add(u,'Recognise exact powers','A perfect square is k × k for an integer k. A perfect cube is k × k × k. Nearby values do not count as exact powers.','Check the exact power, not just its approximate size.','Which is not a square: 16, 25, 35 or 49?',['4² = 16, 5² = 25, 7² = 49.','35 is between 5² and 6², so it is not an integer square.'],'Which listed positive integer is NOT a perfect square?',['36','49','63','81'],dict(type='classify',property='square'),'63 lies strictly between 7² = 49 and 8² = 64.')
    for prompt,options,prop,explanation in [
      ('Which listed number is NOT a multiple of three?',['18','24','35','42'],'multiple3','35 is not divisible by three; the other choices are.'),
      ('Which number is NOT prime?',['31','37','39','41'],'prime','39 = 3 × 13, whereas the other choices are prime.'),
      ('Which number is NOT a perfect square?',['64','100','121','128'],'square','128 lies between 11² = 121 and 12² = 144.'),
      ('Which number is NOT a perfect cube?',['8','27','64','100'],'cube','2³ = 8, 3³ = 27 and 4³ = 64; 100 is not an integer cube.'),
      ('Which listed number is NOT even?',['102','208','315','416'],'even','315 is odd; the other listed numbers are even.')]:quiz(u,prompt,options,dict(type='classify',property=prop),explanation)
