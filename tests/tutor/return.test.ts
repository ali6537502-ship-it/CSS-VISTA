import {test} from 'node:test'
import assert from 'node:assert/strict'
import {learningReturn,type TutorContext} from '../../src/features/tutor/api.ts'
const context: TutorContext={id:'grammar:5:0',category:'grammar',title:'Earlier agreement lesson',text:'Historical source',attribution:'Earlier edition',date:null,return_path:'/grammar-course?day=5',sources:[],feature:'tutor'}
test('saved historical assistance returns through legacy numbering while new contexts retain their edition',()=>{
 const old=new URL(learningReturn(context,'attempt-a'),'https://www.css-vista.com')
 assert.equal(old.searchParams.get('day'),'5');assert.equal(old.searchParams.get('edition'),'legacy');assert.equal(old.searchParams.get('attempt'),'attempt-a')
 const current={...context,id:'grammar-v5:gv5-d10-m01',return_path:'/grammar-course?day=10&section=gv5-d10-m01&edition=v5'}
 const result=new URL(learningReturn(current,'attempt-b'),'https://www.css-vista.com')
 assert.equal(result.searchParams.get('day'),'10');assert.equal(result.searchParams.get('edition'),'v5');assert.equal(result.searchParams.get('attempt'),'attempt-b')
})
