import type { BankQuestion } from './mcq'

// Individually solved mathematics entries already owned by the central MPT
// past-paper bank. Its recurring "None of these" option made the entire maths
// section unusable in a four-option mock. Every admitted row has a reviewed
// answer, a distinct fourth option and explicit working below.
type Review = { fourth: string; explanation: string; answer?: number }
const reviews: Record<number, Review> = {
  248: { fourth: '600 ml', explanation: 'Initially there are 750 ml apple and 1,250 ml orange. After removing 400 ml uniformly, 600 ml apple and 1,000 ml orange remain. (600+x)/1,000=7/5 gives x=800 ml.' },
  268: { fourth: '24', explanation: 'The largest perfect cube no greater than 50 is 27 (3³); 50−27=23 blocks must be removed.' },
  271: { fourth: '0.2 cm', explanation: 'Four hundred sheets at 0.05 mm per sheet are 20 mm thick, which equals 2 cm.' },
  273: { fourth: '85', explanation: 'Every listed number except 54 is divisible by five; 54 is the outlier.' },
  274: { fourth: '8', explanation: 'The six existing terms total 30 and average 5. Adding their mean leaves the average unchanged.' },
  277: { fourth: '10 and 70 degrees', explanation: 'The exterior angle equals the sum of the opposite interior angles. Split 80° in the ratio 1:3 to obtain 20° and 60°.' },
  278: { fourth: '840', explanation: 'The 420 watches remaining represent 60% of the original stock; 420/0.60=700.' },
  279: { fourth: '22 years', explanation: 'Six years ago the ages were 6x and 5x. Four years later they will be 6x+10 and 5x+10. Their ratio 11:10 gives x=2; Babar is now 5x+6=16.' },
  280: { fourth: '776', explanation: 'The annual interest is 854−815=39. Three years of interest equal 117, so the original principal was 815−117=698.' },
  283: { fourth: '84', answer: 3, explanation: 'If the larger integer is L, the smaller is 0.4L. Their difference is 0.6L=36, so L=60, the smaller is 24 and the sum is 84.' },
  285: { fourth: '3/2', explanation: '27=(3³) and 9=(3²); 3k=2, so k=2/3.' },
  286: { fourth: '240', explanation: 'If N cows consume a fixed store in 150 days, then 150N=160(N−10). Solving gives N=160.' },
  287: { fourth: '54 km/h', explanation: 'The train travels 99+231=330 m in 11 seconds, or 30 m/s. Multiply by 3.6 to get 108 km/h.' },
  288: { fourth: '56', explanation: 'Write A=B+12 and C=2B. Then A+B+C=4B+12=112, giving B=25 and C=50.' },
  290: { fourth: '30', explanation: 'Let the daughter now be x and the father 6x. In seven years the ages total 7x+14=49, so x=5. He was 30−5=25 when she was born.' },
  291: { fourth: '6, 7', explanation: 'The required sum is 120−7=113. Consecutive positive numbers 7 and 8 have squares 49 and 64, summing to 113.' },
  293: { fourth: '1 and 10', answer: 3, explanation: 'x²−11x+10=(x−1)(x−10), giving roots 1 and 10.' },
  294: { fourth: 'Rs. 36', explanation: 'Let marker cost m and pencil cost p. Then 5m+p=245 and 3m+3p=327, so m+p=109 and 4m=136; m=34.' },
  295: { fourth: '4', explanation: 'The third term is (1+5)/2=3. The mean of 1,5,3 remains 3, so every later term, including the 27th, is 3.' },
  296: { fourth: '$1.66', explanation: 'With a small cake costing x, 3x+2(2x+3)=16.36, so 7x=10.36 and x=$1.48.' },
  298: { fourth: '3 cm', explanation: 'The perimeter of a semicircle includes the arc and diameter: (π+2)r=20.6. With π≈3.14, r≈4 cm.' },
  299: { fourth: '1,500 litres', explanation: 'The water volume is 1.5×1.0×0.60=0.9 m³. As 1 m³ is 1,000 litres, the tank holds 900 litres at that depth.' },
  300: { fourth: '98m', explanation: 'With π=22/7, the inner radius is 440/(2π)=70 m. Adding the track width of 14 m gives an outer radius of 84 m.' },
  301: { fourth: '46', explanation: 'By inclusion and exclusion, 90+108−46=152 like at least one game; 200−152=48 like neither.' },
  302: { fourth: '170', explanation: 'A 30-day month beginning Monday has five Mondays and 25 other days. (5×450+25×120)/30=175 visitors per day.' },
  303: { fourth: '18m', explanation: 'In 36 seconds Willy finishes 100 m, while Roni at 100/45 m/s covers 80 m. Willy is ahead by 20 m.' },
  304: { fourth: '83', explanation: 'The primes below 21 are 2, 3, 5, 7, 11, 13, 17 and 19; they total 77.' },
  306: { fourth: 'i, iii, ii, iv', explanation: '0.5³=0.125, 0.5²=0.25, 0.5=0.5 and ∛0.5≈0.794; hence iii, i, ii, iv.' },
  307: { fourth: '90', explanation: 'Equal work at equal individual rates requires 30N=40(N−20) worker-days. Thus N=80 initially.' },
  309: { fourth: '11', explanation: 'After transferring x sweets, Roni has 25−x and Tony has 55+x. Set 55+x=4(25−x) to get x=9.' },
  310: { fourth: '22, 23', explanation: 'The two parts 21 and 24 total 45. Four times 24 is 96, nine less than five times 21, which is 105.' },
  311: { fourth: '9 and 45', explanation: 'For a son aged s and father aged 5s, (s−4)(5s−4)=52. At s=6, the former ages are 2 and 26; present ages are 6 and 30.' },
  312: { fourth: '26', answer: 3, explanation: 'Let David be d; then John=d+4 and Joe=d−2. Their total is 3d+2=44, so d=14. John will be 18+8=26.' },
  313: { fourth: 'Rs. 48,000', explanation: 'After food and tuition, 40% remains. Half of that remains after the hostel fee, so Rs 8,000 is 20% of the grant. The grant was Rs 40,000.' },
  314: { fourth: '19', explanation: 'a²+b²=(a+b)²−2ab=5²−2×6=13.' },
  315: { fourth: '6', explanation: 'Complete the square: x²+8x−5=(x+4)²−21. Hence a=4.' },
  317: { fourth: 'Rs. 2,120', explanation: 'If the adult ticket costs p, the child ticket costs p−240. Then 18,500p+2,500(p−240)=41,400,000, giving p=Rs 2,000.' },
  319: { fourth: '2.2 km', explanation: 'Perimeter of a semicircle includes its curved edge and diameter: π×700+1,400=3,600 m=3.6 km (π=22/7).' },
  320: { fourth: '176 sq cm', explanation: 'Total surface area is 2πr(r+h)=2×(22/7)×3.5×(3.5+5.5)=198 cm².' },
  321: { fourth: '18', explanation: 'Of 30 bicycles, one failed both, so 29 passed at least one. Passed both = 27+21−29=19.' },
  323: { fourth: '20', explanation: 'The job equals 18×40=720 woman-days. A day with 16 men and 12 women does 720/20=36 woman-day units, so one man equals 1.5 women. Twelve men and 27 women equal 45 women, requiring 720/45=16 days.' },
}

export function reviewedMptPastAbilityQuestions(bank: BankQuestion[]): BankQuestion[] {
  return bank.filter((question) => question.s === 'Mathematics' && Object.hasOwn(reviews, Number(question.id.split('-').at(-1))))
    .map((question) => {
      const id = Number(question.id.split('-').at(-1))
      const review = reviews[id]
      if (question.o.length !== 4 || !/^None of these$/i.test(question.o[3])) throw new Error(`Past-paper review ${id} no longer matches its source.`)
      return {
        ...question,
        id: `mpt-reviewed-past-ability-${id}`,
        o: [...question.o.slice(0, 3), review.fourth],
        a: review.answer ?? question.a,
        e: review.explanation,
        d: 'Intermediate',
      }
    })
}
