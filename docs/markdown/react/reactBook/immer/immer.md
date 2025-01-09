# Immer

如果你直接修改原始的 state 返回，是触发不了重新渲染的，必须返回一个新的对象才行。

但这也有个问题，如果对象结构很复杂，每次都创建一个新的对象会比较繁琐，而且性能也不好。

因此可以使用 `Immer produce` 包一层。

### produce

```bash
pnpm i -S immer
```

```jsx
import {produce} from 'docs/markdown/react/reactBook/immer/immer';
```

直接对于useState使用

```jsx
 const [num, setNum] = useState(()=>{
    return {a:3}
  })
 setNum(produce(num,
      (draft)=>{
        draft.b = 4
        draft.a = 4 + draft.a
        draft.b = draft.b + draft.a
      }
    )
  )
```

在useReducer中,使用类似

```jsx
 function reducer(state, action) {
  console.log(state, action)
   switch (action.type) {
     case 'add':
       return produce(state, (draft)=>{
          draft.b = 4
	        draft.a = 4 + draft.a
	        draft.b = draft.b + draft.a
       })
     }
 }
```
