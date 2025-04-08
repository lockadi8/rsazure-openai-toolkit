import unittest
from unittest.mock import MagicMock
from rsazure_openai_toolkit.core import integration


class TestIntegrationModule(unittest.TestCase):

    def test_load_azure_client_minimal(self):
        """Ensure client initializes with minimal required config."""
        client = integration.load_azure_client(
            api_key="fake-key",
            azure_endpoint="https://fake.openai.local",
            api_version="2023-12-01-preview"
        )
        self.assertIsInstance(client, integration.AzureOpenAI)

    def test_generate_response_with_mock(self):
        """Ensure generate_response delegates correctly to client."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        result = integration.generate_response(
            client=mock_client,
            deployment_name="gpt-test",
            messages=[{"role": "user", "content": "ping"}]
        )

        self.assertEqual(result, mock_response)
        mock_client.chat.completions.create.assert_called_once()

    def test_main_delegates_to_generate_response(self):
        """Ensure main uses load_azure_client and generate_response."""
        def fake_generate_response(**kwargs):
            return "ok"

        original = integration.generate_response
        integration.generate_response = fake_generate_response

        result = integration.main(
            api_key="key",
            api_version="2023-12-01-preview",
            azure_endpoint="https://fake.openai.local",
            deployment_name="gpt-test",
            messages=[{"role": "user", "content": "ping"}]
        )

        self.assertEqual(result, "ok")
        integration.generate_response = original  # Restore


if __name__ == '__main__':
    unittest.main()
