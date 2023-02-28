The task is to identify whether a scientific abstract answers the given health-related question.
For each question, assess abstracts on:

1. How useful is this abstract for answering the question?
2. For abstracts that are useful, what answer do they support? "Yes" or "no"?

#### Relevance

- Relevant (_then judge answer below_)  
  The abstract either directly answers the question or provides enough information to determine an answer. A useful
  abstract must address _all_ parts of the question and help to make a yes/no decision.
- Not relevant (`0`)  
  The abstract either does not address the question, or fails to address all parts of a question.  
  An abstract is **not** relevant if it:
  - only asks about the effectiveness of a specific treatment but only merely mentions the health issue or
    treatment of the question
  - describes an animal study and does not explicitly mention applicability to humans
  - is not English
  - contains adult material, or
  - is garbled, empty, unreadable or otherwise broken.

  <small>_Example:_
  If the question is "Does yoga improve the management of asthma?" and the document only talks about yoga without talking about asthma or talks about asthma but not yoga, then the document is not-relevant.
  </small>

**Important:** For a relevant abstract, it does not matter whether you believe the information provided in that abstract
is correct or incorrect. Only judge whether a user would likely find the information relevant regardless of the
document's correctness.  
<small>_Example:_
Two relevant documents could have different answers (i.e., yes and no) to the same question, but both would be viewed to
be high quality results from credible sources suitable as top 10 web search results.
</small>

#### Answer

For relevant abstracts, judge whether the answer to the question is "yes" or "no" according to the abstract.

- Yes (`0`)  
  The abstract says the answer to the question is "yes" or provides strong support that would lead to the conclusion
  that the answer is "yes".
- No (`1`)  
  The abstract says the answer to the question is "no" or provides strong support that would lead to the conclusion that
  the answer is "no".
- Unclear (`2`)  
  The abstract addresses the question, but a user would not be able to conclude either "yes" or "no" given the abstract.  
  An abstract has an unclear answer if it:
  - is a meta-analysis or systematic review without a final conclusion
  - concludes an answer only for animals but not for humans
  - the answer could be found in the full study but is not provided in the abstract

#### Summary

Please read each topic's question and description. Then rate each abstract's relevance and answer to the question (only
if abstract is relevant).
