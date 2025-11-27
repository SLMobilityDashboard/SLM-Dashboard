export function ReportingLangChainPrompt(TestResultsData) {
  return `
    You are an AI that generates a detailed JSON report based on API test results.

    ### Instructions:
    - Respond **only** in JSON format.
    - Do not include any explanations or additional text outside the JSON format.
    - The report should contain the following for each test case:
      1. **Test Case Summary**: A detailed description of the test case, explaining what it tests, the conditions, and expected behaviors.
      2. **Test Status**: Indicate whether the test passed or failed.
      3. **Suggestions**: Provide thorough, actionable suggestions for any failed test cases. For passed tests, confirm the API is functioning correctly and mention any potential improvements that could be made for further optimization or edge cases.

    ### Report Example Format:
    {
      "report": [
        {
          "testCaseId": 1,
          "testCaseSummary": "This test case checks the functionality of the 'pets' endpoint when fetching a paginated list of pets using default pagination parameters: 'page=1' and 'pageNum=10'. The expected result is a list of pets along with metadata, including total pets, current page, and the number of pages.",
          "testStatus": "Pass",
          "suggestions": "No changes needed. The test passed successfully. However, consider adding support for pagination edge cases, such as retrieving the last page when there are fewer pets than the page size."
        },
        {
          "testCaseId": 2,
          "testCaseSummary": "This test case simulates an invalid input scenario where the 'page' parameter is a non-integer string ('abc'). It tests how the API handles invalid input for page parameters and whether it returns an appropriate error message.",
          "testStatus": "Fail",
          "suggestions": [
            "The test case failed because the API did not provide sufficient error messaging or proper validation. To improve the API:",
            "Ensure the API validates the input type of the 'page' parameter and responds with a clear error message indicating that the 'page' must be an integer.",
            "Consider adding more granular validation for different types of inputs and potential edge cases (e.g., strings, null, undefined).",
            "Provide suggestions or examples in the error message to help developers and users understand the expected input format."
          ]
        },
        {
          "testCaseId": 3,
          "testCaseSummary": "This test checks the behavior of the '/pets' endpoint when the 'pageNum' parameter is set to a negative value. This simulates a scenario where the user provides invalid input for the number of items per page.",
          "testStatus": "Fail",
          "suggestions": [
            "The API should validate that the 'pageNum' parameter is non-negative and provide a descriptive error message if the value is invalid.",
            "It would be beneficial to implement range validation to ensure 'pageNum' is within acceptable limits (e.g., 1 to 100).",
            "Consider adding boundary tests for both 'page' and 'pageNum' parameters to ensure robustness against various edge cases such as '0' or negative values."
          ]
        }
      ]
    }

    ### Now generate the report based on the following test results:

    ${JSON.stringify(TestResultsData, null, 2)}
  `;
}
