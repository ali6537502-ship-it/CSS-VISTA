"""Original CSS Vista teaching material. Developer tool; production uses the packaged JSON.

Proof expressions are trusted authoring arithmetic, never student input. They are
also retained privately for the independent answer audit and omitted from APIs.
"""
import ast
import hashlib
import json
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def calculate(expression):
    def visit(node):
        if isinstance(node, ast.Constant) and type(node.value) is int:
            return Fraction(node.value)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -visit(node.operand)
        if isinstance(node, ast.BinOp):
            a, b = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add): return a + b
            if isinstance(node.op, ast.Sub): return a - b
            if isinstance(node.op, ast.Mult): return a * b
            if isinstance(node.op, ast.Div): return a / b
            if isinstance(node.op, ast.Pow) and b.denominator == 1 and abs(b) <= 5: return a ** int(b)
        raise ValueError('Unsupported authoring arithmetic')
    return visit(ast.parse(expression, mode='eval').body)

def text(value):
    value = Fraction(value)
    return str(value.numerator) if value.denominator == 1 else f'{value.numerator}/{value.denominator}'

units = []
def unit(slug, title, stage, summary):
    item = dict(id=slug, title=title, stage=stage, summary=summary, lessons=[], quiz=[])
    units.append(item)
    return item

def lesson(item, title, idea, rule, problem, steps, exercise, proof, label, explanation):
    number = len(item['lessons']) + 1
    item['lessons'].append(dict(id=f'{item["id"]}-{number}', title=title, idea=idea, rule=rule,
        example=dict(problem=problem, steps=steps), exercise=dict(id=f'{item["id"]}-practice-{number}',
        prompt=exercise, unit=label, answer=text(calculate(proof)), proof=proof, explanation=explanation)))

def quiz(item, prompt, proof, label, distractors, explanation):
    number = len(item['quiz']) + 1
    answer = text(calculate(proof))
    assert len(distractors) == 3 and len({Fraction(answer), *(Fraction(x) for x in distractors)}) == 4
    position = hashlib.sha256(f'{item["id"]}-{number}'.encode()).digest()[0] % 4
    options = list(distractors)
    options.insert(position, answer)
    item['quiz'].append(dict(id=f'{item["id"]}-quiz-{number}', prompt=prompt, unit=label,
        options=options, answer=position, proof=proof, explanation=explanation))

# STAGE 1 — FOUNDATIONS
u = unit('number-sense', 'Numbers, place value & estimation', 'Foundations', 'Read numbers, work with negatives and check the size of an answer.')
lesson(u, 'Place value', 'A digit has a value because of its position. In 4,582, the 5 represents five hundreds.', 'Expanded form adds the value of each digit.', 'Write 6,307 in expanded form.', ['6 thousands = 6,000; 3 hundreds = 300.', 'There are no tens. Seven ones = 7.', '6,307 = 6,000 + 300 + 7.'], 'What is the value of the digit 7 in 47,206?', '7*1000', 'number', 'The 7 is in the thousands column: 7 × 1,000 = 7,000.')
lesson(u, 'Negative numbers', 'On a number line, adding a positive number moves right. Adding a negative number moves left.', 'Subtracting a negative is adding its opposite: a − (−b) = a + b.', 'Calculate −8 − (−3).', ['Start at −8.', 'Subtracting −3 means adding 3.', '−8 + 3 = −5.'], 'Calculate −12 + 7 − (−4).', '-12+7+4', 'number', '−12 + 7 = −5. Then subtracting −4 adds 4, giving −1.')
lesson(u, 'Estimation', 'Round first to predict the size of a calculation, then compute accurately when an exact answer is required.', 'To round to the nearest ten, check the ones digit: 5 or more rounds up.', 'Estimate 398 × 21 by rounding to 400 and 20.', ['398 is close to 400; 21 is close to 20.', '400 × 20 = 8,000.', 'This is an estimate. The exact product is 8,358.'], 'Round 7,846 to the nearest hundred.', '7800', 'number', 'The tens digit is 4, so 7,846 rounds down to 7,800.')
quiz(u, 'What is the value of 6 in 36,415?', '6000', 'number', ['600','60','60000'], 'The 6 occupies the thousands place.')
quiz(u, 'Calculate −9 − (−14).', '-9+14', 'number', ['-23','23','-5'], 'Subtracting −14 adds 14: −9 + 14 = 5.')
quiz(u, 'Round 12,750 to the nearest hundred.', '12800', 'number', ['12700','13000','12000'], 'The tens digit is 5; increase the hundreds digit.')
quiz(u, 'A temperature rises from −6°C to 8°C. What is the increase?', '8-(-6)', '°C', ['2','-14','-2'], 'Final minus initial = 8 − (−6) = 14°C.')
quiz(u, 'Estimate 49 × 202 by rounding to 50 and 200.', '50*200', 'number', ['1000','10100','9900'], 'The stated rounded product is 50 × 200 = 10,000.')

u = unit('basic-calculation', 'Basic calculation & order of operations', 'Foundations', 'Calculate accurately, handle brackets and use efficient mental methods.')
lesson(u, 'Operation order', 'Multiplication and division have equal priority and are processed left to right. Addition and subtraction then follow left to right.', 'Brackets → powers → multiplication/division → addition/subtraction.', 'Calculate 18 − 6 ÷ 3 × 2.', ['Division and multiplication first: 6 ÷ 3 × 2 = 2 × 2 = 4.', 'Then subtract: 18 − 4 = 14.'], 'Calculate 24 ÷ 6 × 3 + 5.', '24/6*3+5', 'number', '24 ÷ 6 = 4; 4 × 3 = 12; 12 + 5 = 17.')
lesson(u, 'Brackets and powers', 'Brackets can change the calculation. A square means multiply the number by itself, not by two.', 'Evaluate the bracket before applying its power.', 'Calculate (7 − 3)² + 6.', ['7 − 3 = 4.', '4² = 4 × 4 = 16.', '16 + 6 = 22.'], 'Calculate 3 × (8 − 2)².', '3*(8-2)**2', 'number', 'The bracket is 6; its square is 36; 3 × 36 = 108.')
lesson(u, 'Mental calculation', 'Split a difficult product into easy parts. This keeps the value unchanged because multiplication distributes over addition or subtraction.', 'a(b + c) = ab + ac.', 'Calculate 98 × 25.', ['98 = 100 − 2.', '100 × 25 − 2 × 25 = 2,500 − 50.', 'The product is 2,450.'], 'Calculate 48 × 125 without a calculator.', '48*125', 'number', '125 × 8 = 1,000, and 48 = 6 × 8. The product is 6,000.')
quiz(u, 'Calculate 30 − 12 ÷ 4 × 3.', '30-12/4*3', 'number', ['13.5','24','27'], '12 ÷ 4 × 3 = 9, so 30 − 9 = 21.')
quiz(u, 'Calculate (5 + 3)² − 10.', '(5+3)**2-10', 'number', ['6','24','74'], 'The bracket is 8; 8² − 10 = 64 − 10 = 54.')
quiz(u, 'Calculate 16 ÷ 4 ÷ 2.', '16/4/2', 'number', ['8','16','4'], 'Equal-priority divisions run left to right: 4 ÷ 2 = 2.')
quiz(u, 'Calculate 99 × 37.', '99*37', 'number', ['3700','3626','3737'], '100 × 37 − 37 = 3,700 − 37 = 3,663.')
quiz(u, 'Calculate 7 + 2 × (9 − 4)².', '7+2*(9-4)**2', 'number', ['81','32','225'], 'The bracket is 5. Squaring gives 25; doubling and adding 7 gives 57.')

u = unit('hcf-lcm', 'Factors, HCF & LCM', 'Foundations', 'Use factors and multiples to group quantities and solve repeating-event problems.')
lesson(u, 'Factors and primes', 'A factor divides a whole number exactly. A prime number greater than 1 has exactly two positive factors: 1 and itself.', 'Prime factorisation breaks a number into a product of primes.', 'Factorise 84.', ['84 = 2 × 42 = 2 × 2 × 21.', '21 = 3 × 7.', '84 = 2² × 3 × 7.'], 'What is the largest prime factor of 90?', '5', 'number', '90 = 2 × 3² × 5. Its prime factors are 2, 3 and 5.')
lesson(u, 'Highest common factor', 'The HCF is the largest number that divides each given quantity. It is useful when making the largest equal groups without a remainder.', 'For prime factors, use only shared primes with the smaller exponent.', 'Find the HCF of 36 and 48.', ['36 = 2² × 3²; 48 = 2⁴ × 3.', 'The shared part is 2² × 3.', 'HCF = 12.'], 'Find the HCF of 54 and 72.', '18', 'number', '54 = 2 × 3³ and 72 = 2³ × 3². The shared product is 2 × 3² = 18.')
lesson(u, 'Least common multiple', 'The LCM is the smallest positive number divisible by every given number. It tells when repeating events coincide.', 'For prime factors, take every required prime with the larger exponent.', 'Two bells ring every 12 and 18 minutes. After ringing together, when do they next coincide?', ['12 = 2² × 3; 18 = 2 × 3².', 'LCM = 2² × 3² = 36.', 'They next coincide after 36 minutes.'], 'Find the LCM of 15, 20 and 30.', '60', 'number', 'The required prime powers are 2², 3 and 5. Their product is 60.')
quiz(u, 'Find the HCF of 42 and 56.', '14', 'number', ['7','28','2'], '42 = 3 × 14 and 56 = 4 × 14; 14 is the greatest shared factor.')
quiz(u, 'Find the LCM of 8 and 12.', '24', 'number', ['4','48','96'], '8 = 2³ and 12 = 2² × 3; use 2³ × 3 = 24.')
quiz(u, 'Find the HCF of 24, 36 and 60.', '12', 'number', ['6','24','4'], '12 divides all three numbers; their shared prime powers give no larger factor.')
quiz(u, 'Bells ring every 16 and 24 minutes and have just rung together. After how many minutes do they next ring together?', '48', 'minutes', ['8','40','96'], 'LCM(16, 24) = 2⁴ × 3 = 48.')
quiz(u, 'For two positive integers, HCF = 6 and LCM = 90. If one integer is 18, what is the other?', '6*90/18', 'number', ['15','54','45'], 'For two positive integers, product = HCF × LCM. The other integer is 540 ÷ 18 = 30.')

u = unit('fractions', 'Fractions', 'Foundations', 'Simplify, compare and calculate with fractions before applying them to word problems.')
lesson(u, 'Equivalent fractions', 'A fraction represents a number of equal parts. Multiplying or dividing both numerator and denominator by the same nonzero number preserves its value.', 'Simplify by dividing both parts by their HCF.', 'Simplify 18/24.', ['The HCF of 18 and 24 is 6.', 'Divide both parts by 6: 18/24 = 3/4.'], 'Simplify 21/35.', '21/35', 'fraction', 'Divide numerator and denominator by 7: 21/35 = 3/5.')
lesson(u, 'Addition and subtraction', 'Fractions must describe the same-sized parts before they can be added. Use a common denominator, then combine numerators.', 'a/c + b/c = (a + b)/c.', 'Calculate 2/3 + 1/4.', ['Use denominator 12: 2/3 = 8/12 and 1/4 = 3/12.', '8/12 + 3/12 = 11/12.'], 'Calculate 5/6 − 1/4.', '5/6-1/4', 'fraction', 'Use denominator 12: 10/12 − 3/12 = 7/12.')
lesson(u, 'Multiplication and division', 'Multiplication takes a fraction of a quantity. Division by a nonzero fraction multiplies by its reciprocal.', '(a/b) ÷ (c/d) = (a/b) × (d/c), provided b, c and d are nonzero.', 'Calculate (3/5) ÷ (9/10).', ['Multiply by the reciprocal: (3/5) × (10/9).', 'Cancel common factors to get 2/3.'], 'A tank is 3/4 full. One third of that water is removed. What fraction of the whole tank remains?', '3/4*(1-1/3)', 'fraction of tank', 'Two thirds of the existing water remains: (3/4) × (2/3) = 1/2 of the whole tank.')
quiz(u, 'Calculate 3/8 + 1/6.', '3/8+1/6', 'fraction', ['4/14','1/2','11/24'], 'Use denominator 24: 9/24 + 4/24 = 13/24.')
quiz(u, 'Calculate (4/7) × (21/8).', '4/7*21/8', 'fraction', ['3/20','2/3','3/4'], 'Cancel 21 with 7 and 4 with 8: the product is 3/2.')
quiz(u, 'Calculate (5/6) ÷ (10/9).', '5/6/(10/9)', 'fraction', ['25/27','4/3','1/3'], 'Multiply by 9/10: 45/60 = 3/4.')
quiz(u, 'Three fifths of a class of 45 students are present. How many students are absent?', '45*(1-3/5)', 'students', ['27','15','9'], 'Two fifths are absent: (2/5) × 45 = 18.')
quiz(u, 'Calculate 2 + 3/4 − 1/2.', '2+3/4-1/2', 'number', ['7/4','5/4','11/4'], '3/4 − 1/2 = 1/4. Adding 2 gives 9/4.')

u = unit('decimals', 'Decimals', 'Foundations', 'Understand decimal place value, conversions and accurate decimal operations.')
lesson(u, 'Place value and conversion', 'Digits after the decimal point represent tenths, hundredths and thousandths. Leading zeros matter to the value.', 'A terminating decimal can be written over 10, 100, 1,000 and then simplified.', 'Convert 0.375 to a fraction.', ['0.375 = 375/1,000.', 'Divide both parts by 125: 3/8.'], 'Convert 0.125 to a fraction.', '125/1000', 'fraction', '0.125 = 125/1,000 = 1/8.')
lesson(u, 'Decimal operations', 'Align decimal points for addition and subtraction. For multiplication, track the total number of decimal places.', 'Multiplying or dividing by powers of ten changes place value.', 'Calculate 2.4 × 0.15.', ['24 × 15 = 360.', 'The factors have three decimal places in total.', 'Place three decimal digits: 0.360 = 0.36.'], 'Calculate 3.6 × 0.25.', '36/10*25/100', 'number', 'A quarter of 3.6 is 0.9; equivalently, 36 × 25 with three decimal places gives 0.900.')
lesson(u, 'Division and rounding', 'Scale both dividend and divisor equally to make decimal division easier. Round only at the requested final step.', '2.7 ÷ 0.3 = 27 ÷ 3.', 'Calculate 4.8 ÷ 0.06.', ['Multiply both numbers by 100: 480 ÷ 6.', 'The answer is 80.'], 'Calculate 7.2 ÷ 0.08.', '(72/10)/(8/100)', 'number', 'Scale by 100: 720 ÷ 8 = 90.')
quiz(u, 'Convert 0.45 to a fraction in simplest form.', '45/100', 'fraction', ['45/10','5/9','9/25'], '45/100 simplifies to 9/20.')
quiz(u, 'Calculate 0.6 × 0.4.', '6/10*4/10', 'number', ['2.4','0.024','1'], '6 × 4 = 24 with two decimal places: 0.24.')
quiz(u, 'Calculate 5.25 − 1.8.', '525/100-18/10', 'number', ['4.07','3.55','4.45'], 'Write 1.8 as 1.80 and subtract to get 3.45.')
quiz(u, 'Calculate 6.3 ÷ 0.09.', '(63/10)/(9/100)', 'number', ['7','700','0.7'], '630 ÷ 9 = 70.')
quiz(u, 'Round 3.476 to two decimal places.', '348/100', 'number', ['3.47','3.5','3.46'], 'The third decimal digit is 6, so increase the hundredths digit: 3.48.')

u = unit('percentages', 'Percentages', 'Foundations', 'Find parts, compare changes and reverse a percentage increase or decrease.')
lesson(u, 'Percent of a quantity', 'Percent means out of 100. Convert the percentage to a fraction or decimal before multiplying.', 'p% of x = (p/100) × x.', 'Find 15% of 240.', ['10% is 24 and 5% is 12.', '15% = 24 + 12 = 36.'], 'Find 18% of 350.', '18/100*350', 'number', 'Multiply 350 by 18/100 to get 63.')
lesson(u, 'Percentage change', 'A percentage increase or decrease is measured relative to the original value, not the final value.', 'Percentage change = (change/original) × 100.', 'A value rises from 80 to 100. Find the percentage increase.', ['Increase = 100 − 80 = 20.', '20/80 × 100 = 25%.'], 'A value falls from 250 to 200. Find the percentage decrease.', '(250-200)/250*100', '%', 'The fall is 50, and 50/250 × 100 = 20%.')
lesson(u, 'Reverse and successive changes', 'Successive percentage changes multiply their factors. Equal increases and decreases do not usually cancel.', 'A 20% rise multiplies by 1.20; a 20% fall multiplies by 0.80.', 'A price of 500 rises 10% then falls 10%. Find the final price.', ['500 × 1.10 = 550.', '550 × 0.90 = 495.', 'The net change is a 1% decrease.'], 'After a 20% increase, a price is 900. What was the original price?', '900/(120/100)', 'PKR', 'Final = original × 1.20, so original = 900 ÷ 1.20 = 750.')
quiz(u, 'Find 12.5% of 320.', '125/1000*320', 'number', ['25','32','80'], '12.5% is 1/8; 320 ÷ 8 = 40.')
quiz(u, 'A value rises from 120 to 150. What is the percentage increase?', '(150-120)/120*100', '%', ['20','30','125'], 'The increase is 30, measured against 120: 25%.')
quiz(u, 'A price falls by 15% to 680. What was the original price?', '680/(85/100)', 'PKR', ['782','578','700'], '680 represents 85% of the original: 680 ÷ 0.85 = 800.')
quiz(u, 'A quantity rises by 20% and then by 10%. What is the overall percentage increase?', '((120/100)*(110/100)-1)*100', '%', ['30','2','132'], '1.20 × 1.10 = 1.32, so the overall increase is 32%.')
quiz(u, 'A quantity falls by 25%. What percentage increase restores its original value?', '25/75*100', '%', ['25','75','20'], 'The remaining 75 must increase by 25. Relative to 75 this is 100/3%, approximately 33.33%.')

u = unit('ratio-proportion', 'Ratio & proportion', 'Foundations', 'Compare quantities, share totals and distinguish direct from inverse proportion.')
lesson(u, 'Simplifying and sharing', 'A ratio compares quantities in the same units. Add its parts before dividing a known total.', 'For a:b, shares are total × a/(a+b) and total × b/(a+b).', 'Divide 420 in the ratio 2:5.', ['Total parts = 7; one part = 420 ÷ 7 = 60.', 'Shares are 120 and 300.'], 'Divide 560 in the ratio 3:4. What is the smaller share?', '560*3/(3+4)', 'number', 'Seven parts share 560; each part is 80. Three parts give 240.')
lesson(u, 'Direct proportion', 'When the rate stays constant, twice the quantity costs twice as much. Start with the value for one unit.', 'If y is directly proportional to x, y/x is constant.', 'Five notebooks cost 450. What do eight cost at the same rate?', ['One notebook costs 450 ÷ 5 = 90.', 'Eight cost 8 × 90 = 720.'], 'Seven identical items cost 840. What do eleven cost at the same rate?', '840/7*11', 'PKR', 'One item costs 120, so eleven cost 1,320.')
lesson(u, 'Inverse and compound proportion', 'For a fixed job at a fixed rate per worker, more workers need less time. Not every situation is directly proportional.', 'Equal workers × days stays constant for the same job.', 'Six equal workers finish a job in 10 days. How long do 15 equal workers take?', ['The job needs 6 × 10 = 60 worker-days.', '60 ÷ 15 = 4 days.'], 'Eight equally productive workers finish a job in 15 days. How many days do twelve take?', '8*15/12', 'days', 'The fixed job needs 120 worker-days; divide by 12 to get 10 days.')
quiz(u, 'Divide 720 in the ratio 5:7. What is the larger share?', '720*7/12', 'number', ['300','504','360'], 'There are 12 parts of 60; seven parts give 420.')
quiz(u, 'A:B = 2:3 and B:C = 4:5. What is A when C = 30?', '30*8/15', 'number', ['12','20','24'], 'Match B: A:B:C = 8:12:15. C = 30 sets one part to 2, so A = 16.')
quiz(u, 'Four metres of cloth cost 600. What do nine metres cost at the same rate?', '600/4*9', 'PKR', ['1200','1500','900'], 'The rate is 150 per metre; nine metres cost 1,350.')
quiz(u, 'Ten equal workers need 18 days. How long do fifteen need for the same job?', '10*18/15', 'days', ['27','15','9'], '180 worker-days divided by 15 gives 12 days.')
quiz(u, 'A map scale is 1:50,000. A distance of 6 cm represents how many kilometres?', '6*50000/100000', 'km', ['30','0.3','300'], '6 cm represents 300,000 cm = 3,000 m = 3 km.')

# STAGE 2 — APPLIED MATHS
u = unit('averages', 'Averages & weighted averages', 'Applied maths', 'Recover totals, combine groups and understand how a mean changes.')
lesson(u, 'Arithmetic mean', 'An arithmetic mean shares the total equally across the observations. A mean is not necessarily an actual observation.', 'Mean = total/count; total = mean × count.', 'Find the mean of 6, 9, 11 and 14.', ['Total = 40; count = 4.', 'Mean = 40 ÷ 4 = 10.'], 'Find the mean of 8, 12, 15, 17 and 18.', '(8+12+15+17+18)/5', 'number', 'The total is 70. Divide by 5 to get 14.')
lesson(u, 'Missing and replaced values', 'Use the original total to find a missing number or the effect of replacing one value. Changing one observation changes the total by the same amount.', 'New mean = (old total − removed value + new value)/count.', 'Five numbers have mean 20. Four sum to 76. Find the fifth.', ['All five total 5 × 20 = 100.', 'Missing value = 100 − 76 = 24.'], 'Six values have mean 15. Replace a value of 9 with 21. Find the new mean.', '(6*15-9+21)/6', 'number', 'The total increases by 12 from 90 to 102; 102 ÷ 6 = 17.')
lesson(u, 'Weighted means', 'Do not simply average two group means when their sizes differ. Weight each mean by its group size.', 'Combined mean = (n₁m₁ + n₂m₂)/(n₁+n₂).', 'Ten students average 60 marks; twenty average 75. Find the combined mean.', ['Total marks = 10 × 60 + 20 × 75 = 2,100.', 'There are 30 students; mean = 70.'], 'Eight values average 12 and twelve values average 17. Find their combined mean.', '(8*12+12*17)/(8+12)', 'number', 'The totals are 96 and 204. Their combined total 300 divided by 20 is 15.')
quiz(u, 'Find the mean of 4, 10, 14 and 20.', '(4+10+14+20)/4', 'number', ['10','14','16'], '48 ÷ 4 = 12.')
quiz(u, 'Five numbers average 18. Four total 64. Find the fifth.', '5*18-64', 'number', ['18','22','30'], 'The total is 90, so the missing value is 26.')
quiz(u, 'Eight values average 25. A value of 12 is replaced by 36. Find the new mean.', '(8*25-12+36)/8', 'number', ['27','26','49'], 'The total rises by 24, increasing the mean by 3 to 28.')
quiz(u, 'Groups of 15 and 5 students average 40 and 60 marks. Find the combined mean.', '(15*40+5*60)/20', 'marks', ['50','55','48'], 'The total is 900 across 20 students; mean = 45.')
quiz(u, 'Four numbers average 21. Add a fifth number to make the mean 24. Find the new number.', '5*24-4*21', 'number', ['24','33','40'], 'The new total is 120 and the old total is 84; the added number is 36.')

u = unit('profit-loss', 'Profit & loss', 'Applied maths', 'Keep cost price and selling price distinct, and choose the correct percentage base.')
lesson(u, 'Cost and selling price', 'Profit is selling price minus cost price. Loss is cost price minus selling price. In standard profit/loss questions, the percentage is measured against cost price.', 'Profit% = profit/cost × 100; loss% = loss/cost × 100.', 'An item costs 800 and sells for 920. Find profit%.', ['Profit = 120.', '120/800 × 100 = 15%.'], 'An item costs 600 and sells for 690. Find profit%.', '(690-600)/600*100', '%', 'The profit is 90; relative to cost 600, this is 15%.')
lesson(u, 'Finding the selling price', 'Convert a target profit or loss into a multiplier of the cost price.', 'Selling price = cost × (1 ± percentage/100).', 'An item costs 1,250 and is sold at a 12% loss.', ['It sells for 88% of cost.', '1,250 × 0.88 = 1,100.'], 'Find the selling price of an item costing 1,600 with a 25% profit.', '1600*125/100', 'PKR', '125% of 1,600 is 2,000.')
lesson(u, 'Reverse profit and combined sales', 'When selling price and profit% are known, divide by the profit factor. For several sales, compare total selling price against total cost.', 'Cost = selling price/(1 + profit rate).', 'An item sells for 1,080 at a 20% profit. Find cost.', ['1,080 equals 120% of cost.', 'Cost = 1,080 ÷ 1.20 = 900.'], 'Two items each cost 500. One sells at a 20% profit and the other at a 10% loss. Find total profit%.', '((500*120/100+500*90/100)-1000)/1000*100', '%', 'Total selling price is 600 + 450 = 1,050. Profit is 50 on cost 1,000, or 5%.')
quiz(u, 'An item costs 750 and sells for 900. Find profit%.', '(900-750)/750*100', '%', ['15','25','50'], 'Profit is 150 on a cost of 750: 20%.')
quiz(u, 'An item costs 1,200 and sells for 1,020. Find loss%.', '(1200-1020)/1200*100', '%', ['18','12','20'], 'The loss of 180 is 15% of cost.')
quiz(u, 'Find the selling price of an item costing 960 at a 25% profit.', '960*125/100', 'PKR', ['1185','1150','1280'], '960 × 1.25 = 1,200.')
quiz(u, 'An item sells for 1,440 at a 20% loss. Find its cost.', '1440/(80/100)', 'PKR', ['1728','1200','1600'], '1,440 is 80% of cost. Divide by 0.80 to get 1,800.')
quiz(u, 'Two items each sell for 600. One earns 20% profit and the other makes 20% loss. Find the overall loss%.', '((600/(120/100)+600/(80/100))-1200)/(600/(120/100)+600/(80/100))*100', '%', ['0','20','10'], 'Their costs are 500 and 750. Selling total 1,200 loses 50 on 1,250: 4%. Equal selling prices do not give equal costs.')

u = unit('discounts', 'Discounts & successive price changes', 'Applied maths', 'Work from marked price, apply successive discounts and connect discount to profit.')
lesson(u, 'Marked price and discount', 'Discount is the amount removed from marked price. Its percentage base is the marked price, not the selling price.', 'Selling price = marked price × (1 − discount rate).', 'A marked price of 2,000 has a 15% discount.', ['Discount = 300.', 'Selling price = 2,000 − 300 = 1,700.'], 'Find the selling price after a 12% discount on 2,500.', '2500*88/100', 'PKR', 'The customer pays 88% of 2,500, which is 2,200.')
lesson(u, 'Successive discounts', 'Each discount applies to the price remaining after the previous one. Adding the rates overstates the reduction.', 'Final factor = (1 − d₁)(1 − d₂).', 'Apply discounts of 20% then 10% to 1,000.', ['After 20% discount: 800.', 'After another 10%: 720.', 'The combined discount is 28%, not 30%.'], 'Find the equivalent discount% for successive discounts of 10% and 20%.', '(1-90/100*80/100)*100', '%', 'The final factor is 0.90 × 0.80 = 0.72; the discount is 28%.')
lesson(u, 'Discount and profit together', 'A discount can still leave a profit if marked price is sufficiently above cost. Apply the discount first and compare the result with cost.', 'Profit% uses cost; discount% uses marked price.', 'Cost is 800, marked price is 1,200 and discount is 25%. Find profit%.', ['Selling price = 1,200 × 0.75 = 900.', 'Profit = 100 on cost 800.', 'Profit% = 12.5%.'], 'Cost is 1,000 and marked price is 1,500. A 20% discount is allowed. Find profit%.', '(1500*80/100-1000)/1000*100', '%', 'The selling price is 1,200; profit is 200 on 1,000, or 20%.')
quiz(u, 'A price of 1,800 receives a 15% discount. Find the amount paid.', '1800*85/100', 'PKR', ['1535','1500','1620'], 'The customer pays 85% of 1,800 = 1,530.')
quiz(u, 'A customer pays 960 after a 20% discount. Find marked price.', '960/(80/100)', 'PKR', ['1152','1000','1280'], '960 is 80% of the marked price, which is 1,200.')
quiz(u, 'Find the equivalent discount% for 25% followed by 20%.', '(1-75/100*80/100)*100', '%', ['45','5','35'], '0.75 × 0.80 = 0.60, so the reduction is 40%.')
quiz(u, 'Cost is 640, marked price is 1,000 and discount is 20%. Find profit%.', '(1000*80/100-640)/640*100', '%', ['20','16','40'], 'Selling price 800 gives profit 160 on cost 640, or 25%.')
quiz(u, 'What marked price gives 20% profit on cost 900 after a 10% discount?', '(900*120/100)/(90/100)', 'PKR', ['1080','1188','1100'], 'The required selling price is 1,080. Divide by 0.90 to get marked price 1,200.')

u = unit('time-work', 'Time & work', 'Applied maths', 'Use rates for shared jobs, partial work and filling or draining tanks.')
lesson(u, 'Work rates', 'Treat a complete job as one unit. A worker who finishes in n days does 1/n of the job per day when the rate is constant.', 'Work = rate × time.', 'A worker finishes a job in 12 days. What fraction is completed in 3 days?', ['Daily rate = 1/12.', 'Work in 3 days = 3/12 = 1/4.'], 'A worker takes 15 days. What fraction of the job is completed in 6 days?', '6/15', 'fraction of job', '6 × 1/15 = 2/5 of the complete job.')
lesson(u, 'Working together', 'Add rates when independent workers contribute to the same job. Add their output, not the number of days.', 'Together time = 1/(rate₁ + rate₂).', 'A takes 6 days and B takes 12. Find their time together.', ['Combined rate = 1/6 + 1/12 = 1/4.', 'One job takes 4 days.'], 'A takes 10 days and B takes 15. How many days do they take together?', '1/(1/10+1/15)', 'days', 'Their combined rate is 1/6 of a job per day, so they need 6 days.')
lesson(u, 'Partial work and opposing rates', 'After part of a job is done, divide only the remaining work by the new rate. A drain subtracts from a filling rate.', 'Net rate = filling rate − draining rate.', 'A pipe fills in 8 hours and a drain empties in 24 hours. Find time to fill with both open.', ['Net rate = 1/8 − 1/24 = 1/12 tank per hour.', 'An empty tank fills in 12 hours.'], 'A takes 12 days and B takes 18. They work together for 3 days, then B leaves. How many additional days does A need?', '(1-3*(1/12+1/18))/(1/12)', 'days', 'They complete 5/12 in three days. A finishes the remaining 7/12 at 1/12 per day, requiring 7 additional days.')
quiz(u, 'A completes a job in 20 days. What fraction does A complete in 5 days?', '5/20', 'fraction of job', ['1/5','3/4','1/2'], 'Five days at 1/20 per day completes 1/4.')
quiz(u, 'A takes 8 days and B takes 24. Find their time together.', '1/(1/8+1/24)', 'days', ['16','8','4'], 'Combined rate is 1/6, so time is 6 days.')
quiz(u, 'A and B together take 6 days. A alone takes 10. Find B’s time alone.', '1/(1/6-1/10)', 'days', ['4','16','12'], 'B’s rate is 1/6 − 1/10 = 1/15; B takes 15 days.')
quiz(u, 'A pipe fills in 6 hours while a drain empties in 18. With both open, how long to fill an empty tank?', '1/(1/6-1/18)', 'hours', ['12','4','24'], 'Net rate is 1/9 tank per hour, so time is 9 hours.')
quiz(u, 'A takes 9 days. B takes 18. A works alone for 3 days, then B joins. How many additional days finish the job?', '(1-3/9)/(1/9+1/18)', 'days', ['6','3','5'], 'Two thirds remain. Together the rate is 1/6, so the remaining time is 4 days.')

u = unit('speed-distance', 'Speed, distance & time', 'Applied maths', 'Convert units, calculate journey averages and solve relative-speed problems.')
lesson(u, 'Units and basic journeys', 'Use consistent distance and time units. Speed is distance per unit time; time is distance divided by speed.', 'km/h to m/s: multiply by 5/18. m/s to km/h: multiply by 18/5.', 'A vehicle travels 150 km in 2.5 hours. Find speed.', ['Speed = 150 ÷ 2.5 = 60 km/h.', '60 km/h = 50/3 m/s, approximately 16.67 m/s.'], 'Convert 72 km/h into m/s.', '72*5/18', 'm/s', '72 × 5/18 = 20 m/s.')
lesson(u, 'Average speed', 'Average speed uses total distance divided by total time. Averaging two speeds is valid for equal travel times, not generally for equal distances.', 'For equal distances at speeds u and v, average = 2uv/(u+v).', 'Travel equal distances at 40 and 60 km/h. Find average speed.', ['Take 120 km in each direction.', 'Times are 3 and 2 hours. Total distance 240 km divided by 5 hours = 48 km/h.'], 'Travel equal distances at 30 and 60 km/h. Find average speed.', '2*30*60/(30+60)', 'km/h', 'For equal distances, 2 × 30 × 60 ÷ 90 = 40 km/h.')
lesson(u, 'Relative speed', 'Opposite-direction closing speeds add. Same-direction closing speeds subtract. A train crossing a platform travels its own length plus platform length.', 'Crossing time = total crossing distance/relative speed.', 'A 120 m train at 54 km/h crosses a 180 m platform.', ['54 km/h = 15 m/s.', 'The train travels 120 + 180 = 300 m.', 'Time = 300 ÷ 15 = 20 seconds.'], 'A 150 m train moving at 72 km/h crosses a 250 m platform. Find the time.', '(150+250)/(72*5/18)', 'seconds', 'The crossing distance is 400 m and the speed is 20 m/s, giving 20 seconds.')
quiz(u, 'How long to travel 180 km at 60 km/h?', '180/60', 'hours', ['2','4','10800'], 'Time = distance/speed = 3 hours.')
quiz(u, 'Convert 90 km/h into m/s.', '90*5/18', 'm/s', ['18','30','324'], '90 × 5/18 = 25 m/s.')
quiz(u, 'Travel equal distances at 40 and 80 km/h. Find average speed.', '2*40*80/(40+80)', 'km/h', ['60','50','120'], 'The harmonic mean is 160/3 km/h, approximately 53.33 km/h.')
quiz(u, 'Two travellers start 270 km apart and approach at 40 and 50 km/h. When do they meet?', '270/(40+50)', 'hours', ['6','5.4','2.7'], 'Closing speed is 90 km/h, so time is 3 hours.')
quiz(u, 'A 180 m train passes a stationary pole at 54 km/h. Find the time.', '180/(54*5/18)', 'seconds', ['10','15','3.33'], 'The speed is 15 m/s, and only train length is crossed: 180/15 = 12 seconds.')

u = unit('age-problems', 'Age problems', 'Applied maths', 'Translate past and future ages into equations while keeping age differences constant.')
lesson(u, 'Age differences', 'Everyone’s age increases by the same elapsed time, so an age difference remains unchanged.', 'If present age is x, age t years later is x+t and t years earlier is x−t.', 'A is 28 and B is 16. What is their age difference six years later?', ['They become 34 and 22.', 'The difference remains 12 years.'], 'A is 31 and B is 19. Find their age difference eight years later.', '(31+8)-(19+8)', 'years', 'Both ages increase by 8, so their difference remains 12.')
lesson(u, 'Ratios of present ages', 'Use a common multiplier for an age ratio. A known sum or difference then determines that multiplier.', 'For ratio a:b, write ages as ak and bk.', 'Ages are in ratio 3:5 and total 48.', ['3k + 5k = 48, so k = 6.', 'The ages are 18 and 30.'], 'Two ages are in ratio 2:5 and their sum is 49. Find the younger age.', '49*2/7', 'years', 'Seven parts total 49, so one part is 7 and the younger age is 14.')
lesson(u, 'Future and past equations', 'Add or subtract time from each person separately before applying the stated future or past ratio.', 'Present age relationships need not retain the same ratio over time.', 'A is now 3 times B. In 10 years A will be twice B. Find B’s current age.', ['Let B = x and A = 3x.', '3x + 10 = 2(x + 10).', 'x = 10, so B is 10 and A is 30.'], 'A father is 4 times his son’s age. In 12 years he will be twice his son’s age. Find the son’s present age.', '12/(4-2)', 'years', '4x + 12 = 2(x + 12); 2x = 12, so x = 6.')
quiz(u, 'A is 40 and B is 25. Find their age difference after 9 years.', '(40+9)-(25+9)', 'years', ['24','6','65'], 'Their age difference stays 15 years.')
quiz(u, 'Two present ages are in ratio 3:4 and total 56. Find the older age.', '56*4/7', 'years', ['24','28','42'], 'Each ratio part is 8; the older age is 4 × 8 = 32.')
quiz(u, 'A is twice B and their ages sum to 45. Find B’s age.', '45/3', 'years', ['30','22.5','10'], 'If B = x, A = 2x; 3x = 45 gives x = 15.')
quiz(u, 'A mother is 3 times her daughter’s age. In 8 years she will be twice the daughter’s age. Find the daughter’s current age.', '8/(3-2)', 'years', ['16','24','4'], '3x + 8 = 2(x + 8), giving x = 8.')
quiz(u, 'Five years ago A was 4 times B’s age. A is now 45. Find B’s present age.', '(45-5)/4+5', 'years', ['10','11.25','20'], 'Five years ago A was 40 and B was 10. B is now 15.')

u = unit('word-problems', 'Basic word problems & translating quantities', 'Applied maths', 'Choose a variable, keep units consistent and check a story against its equation.')
lesson(u, 'Build an equation', 'Start with what the unknown represents. Translate each phrase in order and verify the answer in the original statement.', '“Five more than three times x” is 3x + 5, not 3(x+5).', 'Five more than three times a number is 29. Find it.', ['Write 3x + 5 = 29.', '3x = 24, so x = 8.', 'Check: 3 × 8 + 5 = 29.'], 'Seven less than four times a number is 33. Find the number.', '(33+7)/4', 'number', '4x − 7 = 33, so 4x = 40 and x = 10.')
lesson(u, 'Count and cost', 'A total number of items gives one relationship; a total cost gives another. Subtract a convenient all-one-price baseline.', 'Extra cost divided by price difference gives the number of dearer items.', 'Ten tickets cost 700. Adult tickets are 100 and child tickets 50. How many adult tickets?', ['If all ten were child tickets, cost would be 500.', 'The extra 200 buys four upgrades of 50.', 'There are four adult tickets and six child tickets.'], 'Twelve items cost 900. Each is priced at either 50 or 100. How many cost 100?', '(900-12*50)/(100-50)', 'items', 'The all-cheap baseline is 600. The extra 300 represents six upgrades of 50.')
lesson(u, 'Mixtures and conservation', 'Mixing preserves the amount of the substance being tracked. A concentration refers to substance divided by total mixture.', 'Substance before mixing = substance after mixing, unless some is added or removed.', 'Mix 2 L of 20% solution with 3 L of 40% solution. Find concentration%.', ['Tracked substance = 0.4 + 1.2 = 1.6 L.', 'Total mixture = 5 L.', '1.6/5 × 100 = 32%.'], 'Mix 4 L of 10% solution with 6 L of 30% solution. Find the final concentration%.', '(4*10/100+6*30/100)/(4+6)*100', '%', 'There are 0.4 + 1.8 = 2.2 L of the tracked substance in 10 L, giving 22%.')
quiz(u, 'Three less than twice a number equals 17. Find the number.', '(17+3)/2', 'number', ['7','8.5','20'], '2x − 3 = 17 gives x = 10.')
quiz(u, 'Three consecutive integers total 72. Find the middle integer.', '72/3', 'number', ['23','25','26'], 'The values are x−1, x, x+1, so 3x = 72 and x = 24.')
quiz(u, 'Eight tickets cost 640. Adult tickets cost 100 and child tickets 60. Find the number of adult tickets.', '(640-8*60)/(100-60)', 'tickets', ['3','5','6'], 'The baseline is 480; extra cost 160 buys four upgrades of 40.')
quiz(u, 'Mix 3 L of 20% solution with 2 L of 50% solution. Find concentration%.', '(3*20/100+2*50/100)/5*100', '%', ['35','30','70'], 'The substance totals 1.6 L in 5 L, giving 32%.')
quiz(u, 'Two numbers sum to 50 and differ by 8. Find the larger number.', '(50+8)/2', 'number', ['21','25','33'], 'Let larger x and smaller 50−x. Then 2x−50 = 8, giving x = 29.')

# STAGE 3 — ALGEBRA, PATTERNS AND GEOMETRY
u = unit('number-series', 'Number series & patterns', 'Algebra & geometry', 'Apply stated sequence rules and check differences or ratios without guessing a unique rule from a short list.')
lesson(u, 'Constant differences', 'An arithmetic sequence changes by the same amount each step. Its nth term uses the first term plus n−1 changes.', 'aₙ = a₁ + (n−1)d.', 'Find the 10th term of 4, 7, 10, …, using a constant difference of 3.', ['a₁ = 4, d = 3, n = 10.', 'a₁₀ = 4 + 9 × 3 = 31.'], 'A sequence starts at 5 and adds 4 each time. Find its 12th term.', '5+(12-1)*4', 'number', 'There are eleven jumps from the first to the twelfth term: 5 + 44 = 49.')
lesson(u, 'Constant ratios', 'A geometric sequence multiplies by a fixed ratio. Count the number of multiplications from the first term.', 'aₙ = a₁ × r^(n−1).', 'Starting at 3 and doubling each term, find the 5th term.', ['The terms are 3, 6, 12, 24, 48.', '3 × 2⁴ = 48.'], 'A sequence starts at 2 and triples each term. Find the 5th term.', '2*3**4', 'number', 'Four multiplications by 3 give 2 × 81 = 162.')
lesson(u, 'Changing differences', 'A finite list can fit many rules. In practice, use the specified difference pattern rather than claiming a mathematically unique continuation.', 'Write consecutive differences, then test the stated rule.', 'The sequence 2, 5, 10, 17, … uses successive odd differences 3, 5, 7, 9, … . Find the next term.', ['The next difference is 9.', '17 + 9 = 26.'], 'A sequence is 3, 7, 13, 21, … and its differences are successive even numbers 4, 6, 8, 10, … . Find the next term.', '21+10', 'number', 'Under the stated rule, add the next difference 10 to 21, giving 31.')
quiz(u, 'A sequence starts at 7 and adds 5 each step. Find its 8th term.', '7+7*5', 'number', ['47','40','35'], 'Seven differences give 7 + 35 = 42.')
quiz(u, 'A sequence starts at 4 and doubles each step. Find its 6th term.', '4*2**5', 'number', ['64','256','24'], 'Five doublings give 4 × 32 = 128.')
quiz(u, 'The nth term is n² + 1. Find the 7th term.', '7**2+1', 'number', ['49','15','48'], 'Substitute n = 7: 49 + 1 = 50.')
quiz(u, 'The sequence 1, 4, 9, 16, … has nth term n². Find the next term.', '5**2', 'number', ['24','20','32'], 'The next term is the fifth square, 25.')
quiz(u, 'Starting at 100, subtract 7 each step. Find the 9th term.', '100-8*7', 'number', ['37','51','63'], 'Eight subtractions give 100 − 56 = 44.')

u = unit('algebra', 'Algebraic expressions', 'Algebra & geometry', 'Substitute values, collect like terms and expand or factor expressions.')
lesson(u, 'Substitution', 'A variable stands for a number. Substitute its value with brackets, particularly when it is negative.', 'For x = −2, x² = (−2)² = 4.', 'Evaluate 3x² − 2x + 1 at x = −2.', ['3 × 4 − 2 × (−2) + 1.', '12 + 4 + 1 = 17.'], 'Evaluate 2x² + 3x − 1 at x = −3.', '2*(-3)**2+3*(-3)-1', 'number', '2 × 9 − 9 − 1 = 8.')
lesson(u, 'Like terms and expansion', 'Like terms have the same variable parts and powers. Apply multiplication to every term inside a bracket.', '3x + 2x = 5x; 3x + 2x² cannot be combined into one like term.', 'Simplify 3(x + 4) − 2(x − 1), then use x = 5.', ['Expand: 3x + 12 − 2x + 2.', 'Collect: x + 14.', 'At x = 5, the value is 19.'], 'Evaluate the simplified expression 4(x + 2) − 3(x − 1) at x = 6.', '4*(6+2)-3*(6-1)', 'number', 'Expand to 4x + 8 − 3x + 3 = x + 11. At x = 6 the value is 17.')
lesson(u, 'Factors and identities', 'Factoring reverses expansion. A square of a sum includes a middle term; it is not just the sum of two squares.', '(a+b)² = a² + 2ab + b²; a²−b² = (a−b)(a+b).', 'Calculate 51² using (50 + 1)².', ['50² + 2 × 50 × 1 + 1².', '2,500 + 100 + 1 = 2,601.'], 'Calculate 103² − 97² using the difference of squares.', '(103-97)*(103+97)', 'number', 'The product (103−97)(103+97) = 6 × 200 = 1,200.')
quiz(u, 'Evaluate 5x − 2 at x = 7.', '5*7-2', 'number', ['35','37','23'], '35 − 2 = 33.')
quiz(u, 'Evaluate x² − 3x at x = −4.', '(-4)**2-3*(-4)', 'number', ['4','-28','-4'], '16 + 12 = 28.')
quiz(u, 'Evaluate 2(x + 5) + 3(x − 2) at x = 4.', '2*(4+5)+3*(4-2)', 'number', ['20','26','30'], 'The expression simplifies to 5x + 4. At 4 it equals 24.')
quiz(u, 'Calculate 48 × 52 using a difference of squares.', '50**2-2**2', 'number', ['2504','2400','2492'], '(50−2)(50+2) = 2,500 − 4 = 2,496.')
quiz(u, 'For a = 3 and b = 5, calculate (a + b)².', '(3+5)**2', 'number', ['34','16','30'], 'The whole sum is squared: 8² = 64, not a² + b² = 34.')

u = unit('equations', 'Equations: linear, simultaneous & quadratic', 'Algebra & geometry', 'Maintain equality, solve two unknowns and factor a quadratic with explicit answer conditions.')
lesson(u, 'Linear equations', 'An equation remains balanced if the same operation is applied to both sides. Expand brackets before collecting terms.', 'Move toward an isolated variable, then substitute to check.', 'Solve 3(x − 2) = 18.', ['Divide both sides by 3: x − 2 = 6.', 'Add 2 to both sides: x = 8.', 'Check: 3 × (8 − 2) = 18.'], 'Solve 5x + 7 = 42.', '(42-7)/5', 'value of x', 'Subtract 7 to get 5x = 35; divide by 5 to get x = 7.')
lesson(u, 'Simultaneous equations', 'Two independent equations can determine two unknowns. Addition or subtraction may eliminate one variable.', 'Eliminate, solve, then substitute into either original equation.', 'Solve x + y = 10 and x − y = 4.', ['Add: 2x = 14, so x = 7.', 'Substitute: y = 3.', 'Both equations are satisfied.'], 'Solve x + y = 13 and x − y = 5. Enter x.', '(13+5)/2', 'value of x', 'Add the equations: 2x = 18, so x = 9; y = 4.')
lesson(u, 'Quadratic equations', 'A factored quadratic equals zero when at least one factor is zero. Check all roots and apply any explicit condition.', 'If (x−a)(x−b) = 0, then x = a or x = b.', 'Solve x² − 5x + 6 = 0.', ['Find numbers with product 6 and sum 5: 2 and 3.', '(x − 2)(x − 3) = 0.', 'The two roots are 2 and 3.'], 'For x² − 7x + 12 = 0, enter the larger root.', '4', 'value of x', 'Factor as (x−3)(x−4) = 0. The roots are 3 and 4; the larger is 4.')
quiz(u, 'Solve 4x − 9 = 23.', '(23+9)/4', 'value of x', ['3.5','7','9'], '4x = 32, so x = 8.')
quiz(u, 'Solve 2(x + 3) = 5x − 9.', '(6+9)/(5-2)', 'value of x', ['3','-5','15'], '2x + 6 = 5x − 9 gives 15 = 3x, so x = 5.')
quiz(u, 'Solve x + y = 18 and x − y = 6. Enter y.', '(18-6)/2', 'value of y', ['12','9','3'], 'Subtract equations: 2y = 12, giving y = 6.')
quiz(u, 'Solve 2x + y = 11 and x − y = 1. Enter x.', '(11+1)/3', 'value of x', ['3','5','6'], 'Add equations to get 3x = 12, so x = 4 and y = 3.')
quiz(u, 'For x² − 9x + 20 = 0, enter the smaller root.', '4', 'value of x', ['5','9','20'], '(x−4)(x−5) = 0, so the smaller root is 4.')

u = unit('geometry-area', 'Geometry, angles & area', 'Algebra & geometry', 'Use angle relationships, distinguish perimeter from area and apply right-triangle geometry.')
lesson(u, 'Angles and triangles', 'Angles on a straight line total 180°. Angles around a point total 360°. Interior angles in an ordinary plane triangle total 180°.', 'Missing triangle angle = 180° − the two known angles.', 'A triangle has angles 50° and 65°. Find its third angle.', ['50 + 65 = 115.', '180 − 115 = 65°.'], 'A triangle has angles 35° and 75°. Find the third angle.', '180-35-75', 'degrees', 'The two known angles total 110°. The remaining angle is 70°.')
lesson(u, 'Perimeter and area', 'Perimeter measures boundary length; area measures enclosed surface. Square units cannot be added directly to length units.', 'Rectangle: area = length × width; perimeter = 2(length+width). Triangle area = ½ × base × perpendicular height.', 'Find area and perimeter of a 9 cm by 4 cm rectangle.', ['Area = 9 × 4 = 36 cm².', 'Perimeter = 2(9+4) = 26 cm.'], 'A triangle has base 12 cm and perpendicular height 7 cm. Find its area.', '12*7/2', 'cm²', 'Half of base × height is (12 × 7)/2 = 42 cm².')
lesson(u, 'Right triangles and composite shapes', 'The Pythagorean theorem applies to right triangles only. The hypotenuse is opposite the right angle and is the longest side.', 'For a right triangle, c² = a² + b². Split composite areas into non-overlapping parts.', 'A right triangle has perpendicular sides 6 cm and 8 cm.', ['Hypotenuse² = 36 + 64 = 100.', 'The positive hypotenuse length is 10 cm.'], 'A rectangle is 15 cm by 10 cm. A 3 cm by 4 cm rectangular corner is removed. Find the remaining area.', '15*10-3*4', 'cm²', 'Subtract the removed area 12 from the original area 150, giving 138 cm².')
quiz(u, 'Two angles of a triangle are 42° and 68°. Find the third.', '180-42-68', 'degrees', ['80','110','60'], 'The third angle is 180 − 110 = 70°.')
quiz(u, 'Find the perimeter of an 8 cm by 5 cm rectangle.', '2*(8+5)', 'cm', ['40','13','80'], 'Add all sides: 2(8+5) = 26 cm.')
quiz(u, 'A triangle has base 14 cm and perpendicular height 9 cm. Find area.', '14*9/2', 'cm²', ['126','23','46'], 'Area = ½ × 14 × 9 = 63 cm².')
quiz(u, 'A right triangle has perpendicular sides 5 cm and 12 cm. Find its hypotenuse.', '13', 'cm', ['17','7','169'], '5² + 12² = 169 = 13², so the positive length is 13 cm.')
quiz(u, 'A square of side 10 cm has a non-overlapping 4 cm by 3 cm corner removed. Find the remaining area.', '10**2-4*3', 'cm²', ['76','112','28'], 'The original area 100 minus the removed area 12 gives 88 cm².')

u = unit('circles', 'Circles: circumference, area & sectors', 'Algebra & geometry', 'Use radius correctly and relate sectors or rings to complete circles.')
lesson(u, 'Radius and circumference', 'Diameter is twice radius. Circumference is the boundary length of a circle; it uses length units.', 'd = 2r; circumference = 2πr = πd.', 'Find circumference when radius is 7 cm, using π = 22/7.', ['2 × (22/7) × 7 = 44 cm.'], 'Find circumference of a circle with diameter 14 cm. Use π = 22/7.', '22/7*14', 'cm', 'Use πd, not 2πd: (22/7) × 14 = 44 cm.')
lesson(u, 'Circle area and rings', 'A circle’s area depends on radius squared. For a ring, subtract the smaller concentric circle from the larger one.', 'Area = πr²; ring area = π(R²−r²).', 'Find area for radius 7 cm, using π = 22/7.', ['Area = (22/7) × 49 = 154 cm².'], 'A ring has outer radius 14 cm and inner radius 7 cm. Find its area. Use π = 22/7.', '22/7*(14**2-7**2)', 'cm²', 'Subtract areas: (22/7) × (196−49) = 462 cm².')
lesson(u, 'Sectors and arcs', 'A sector represents its central-angle fraction of a full circle. Sector area and arc length use the same fraction but different full-circle formulas.', 'Sector area = (θ/360)πr²; arc length = (θ/360)2πr.', 'Find a 90° sector’s area with radius 14 cm, using π = 22/7.', ['The sector is one quarter of the circle.', 'Area = (1/4) × (22/7) × 196 = 154 cm².'], 'Find the arc length of a 60° sector of radius 21 cm. Use π = 22/7.', '60/360*2*22/7*21', 'cm', 'A sixth of circumference 132 cm is 22 cm.')
quiz(u, 'A circle has radius 10 cm. Find its diameter.', '2*10', 'cm', ['5','100','10'], 'Diameter is twice radius, so it is 20 cm.')
quiz(u, 'Find circumference for radius 21 cm. Use π = 22/7.', '2*22/7*21', 'cm', ['66','462','42'], '2 × (22/7) × 21 = 132 cm.')
quiz(u, 'Find area for diameter 28 cm. Use π = 22/7.', '22/7*14**2', 'cm²', ['2464','88','154'], 'Radius is 14, so area is (22/7) × 196 = 616 cm².')
quiz(u, 'Find area of a 90° sector with radius 7 cm. Use π = 22/7.', '90/360*22/7*7**2', 'cm²', ['154','77','44'], 'A quarter of 154 is 38.5 cm².')
quiz(u, 'Find the ring area for outer radius 21 cm and inner radius 14 cm. Use π = 22/7.', '22/7*(21**2-14**2)', 'cm²', ['154','385','1540'], 'π(441−196) = (22/7) × 245 = 770 cm².')

u = unit('surface-area', 'Surface area', 'Algebra & geometry', 'Identify exposed surfaces and distinguish curved area from total area.')
lesson(u, 'Cubes and cuboids', 'Surface area adds the areas of exposed faces. A closed cuboid has three pairs of equal rectangular faces.', 'Closed cuboid: 2(lw + lh + wh). Cube: 6a².', 'Find total surface area of a closed cuboid 5 cm × 4 cm × 3 cm.', ['Face pairs have areas 20, 15 and 12.', 'Double their sum: 2 × 47 = 94 cm².'], 'Find the total surface area of a cube of side 6 cm.', '6*6**2', 'cm²', 'Each of six faces has area 36 cm²; total is 216 cm².')
lesson(u, 'Cylinders and open containers', 'A cylinder’s curved surface unrolls to a rectangle of width 2πr and height h. Include only the circular ends that actually exist.', 'Curved area = 2πrh; closed total = 2πr(h+r); open-top container = 2πrh + πr².', 'Find total area of a closed cylinder, r = 7 cm, h = 10 cm. Use π = 22/7.', ['Curved area = 440 cm².', 'Two ends contribute 308 cm².', 'Total = 748 cm².'], 'Find surface area of an open-top cylindrical container, radius 7 cm and height 10 cm. Use π = 22/7.', '2*22/7*7*10+22/7*7**2', 'cm²', 'Include curved side 440 and one base 154: total 594 cm².')
lesson(u, 'Cones and spheres', 'A cone’s curved surface uses slant height, not vertical height. A sphere has one curved surface and no circular base.', 'Cone total = πrl + πr². Sphere area = 4πr².', 'Find total surface area of a cone with radius 7 cm and slant height 10 cm. Use π = 22/7.', ['Curved surface = (22/7) × 7 × 10 = 220.', 'Base area = 154.', 'Total = 374 cm².'], 'Find surface area of a sphere of radius 7 cm. Use π = 22/7.', '4*22/7*7**2', 'cm²', '4πr² = 4 × 154 = 616 cm².')
quiz(u, 'Find total surface area of a cube of side 5 cm.', '6*5**2', 'cm²', ['125','25','100'], 'Six square faces give 6 × 25 = 150 cm².')
quiz(u, 'Find total surface area of a closed cuboid 8 cm × 5 cm × 3 cm.', '2*(8*5+8*3+5*3)', 'cm²', ['120','79','240'], 'Twice the face-area sum gives 2 × 79 = 158 cm².')
quiz(u, 'Find curved surface area of a cylinder, radius 7 cm and height 12 cm. Use π = 22/7.', '2*22/7*7*12', 'cm²', ['154','836','264'], '2πrh = 44 × 12 = 528 cm²; do not add end faces.')
quiz(u, 'Find curved surface area of a cone, radius 14 cm and slant height 15 cm. Use π = 22/7.', '22/7*14*15', 'cm²', ['1276','616','1320'], 'Curved area = πrl = (22/7) × 14 × 15 = 660 cm².')
quiz(u, 'Find surface area of a sphere of radius 14 cm. Use π = 22/7.', '4*22/7*14**2', 'cm²', ['616','1232','88'], '4πr² = 4 × 616 = 2,464 cm².')

u = unit('volume', 'Volume & capacity', 'Algebra & geometry', 'Calculate solid volume, convert capacity and use volume conservation.')
lesson(u, 'Cubes, cuboids and capacity', 'Volume measures occupied space in cubic units. Capacity conversions must cube the length conversion.', 'Cuboid volume = lwh; cube volume = a³. 1 litre = 1,000 cm³; 1 m³ = 1,000 litres.', 'Find capacity of a cuboid tank 50 cm × 40 cm × 30 cm.', ['Volume = 60,000 cm³.', 'Divide by 1,000 to get 60 litres.'], 'A tank is 80 cm × 50 cm × 40 cm. Find its capacity in litres.', '80*50*40/1000', 'litres', 'Volume is 160,000 cm³; dividing by 1,000 gives 160 litres.')
lesson(u, 'Cylinders and displacement', 'Cylinder volume is base area times vertical height. For a submerged object, the water-volume increase equals the submerged volume when no water spills.', 'Cylinder volume = πr²h.', 'Find volume of a cylinder with radius 7 cm and height 10 cm. Use π = 22/7.', ['Base area = 154 cm².', 'Volume = 154 × 10 = 1,540 cm³.'], 'Find volume of a cylinder with radius 14 cm and height 5 cm. Use π = 22/7.', '22/7*14**2*5', 'cm³', 'Base area is 616 cm²; multiplying by height 5 gives 3,080 cm³.')
lesson(u, 'Cones, spheres and scaling', 'A cone has one third of the volume of a cylinder with the same base and vertical height. Scaling every length by k multiplies volume by k³.', 'Cone = ⅓πr²h. Sphere = 4/3 πr³.', 'Find volume of a cone with r = 7 cm and h = 12 cm. Use π = 22/7.', ['The matching cylinder has volume 154 × 12 = 1,848.', 'The cone volume is 1,848 ÷ 3 = 616 cm³.'], 'A cube has volume 27 cm³. Every edge is doubled. Find its new volume.', '27*2**3', 'cm³', 'Doubling all three dimensions multiplies volume by 8, giving 216 cm³.')
quiz(u, 'Find volume of a cube of side 4 cm.', '4**3', 'cm³', ['16','96','12'], 'Volume = 4³ = 64 cm³.')
quiz(u, 'Convert 2.5 litres to cm³.', '25/10*1000', 'cm³', ['250','25','25000'], 'Each litre is 1,000 cm³, so 2.5 litres is 2,500 cm³.')
quiz(u, 'Find volume of a cylinder, radius 7 cm and height 8 cm. Use π = 22/7.', '22/7*7**2*8', 'cm³', ['352','616','154'], 'πr²h = 154 × 8 = 1,232 cm³.')
quiz(u, 'Find volume of a cone, radius 7 cm and vertical height 9 cm. Use π = 22/7.', '22/7*7**2*9/3', 'cm³', ['1386','154','616'], 'One third of 154 × 9 gives 462 cm³.')
quiz(u, 'Find volume of a sphere with radius 3 cm. Use π = 3.14.', '4/3*314/100*3**3', 'cm³', ['113.4','28.26','339.12'], '4/3 × 3.14 × 27 = 113.04 cm³.')

import runpy
runpy.run_path(str(Path(__file__).with_name('reasoning-course.py')))['append'](units)
assert len(units) == 25
assert all(len(x['lessons']) == 3 and len(x['quiz']) == 5 for x in units)
course = dict(title='General Ability', edition='2026-10-11-v2', attribution='Original CSS Vista learning exercises; not presented as authentic past-paper questions.', units=units, previous_editions=json.loads(Path(__file__).with_name('previous-editions.json').read_text()))
output = ROOT / 'public/api/_premium_files/general-ability-course.json'
encoded = json.dumps(course, ensure_ascii=False, indent=2) + '\n'
if '--check' in __import__('sys').argv:
    assert output.read_text() == encoded, 'Rebuild the authored course package.'
else:
    output.write_text(encoded)
print('General Ability: 25 topics, 75 lessons/exercises and 125 quiz questions verified and packaged privately.')
